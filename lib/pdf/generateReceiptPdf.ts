import type { ProtocolDetails } from '@/lib/db/keyProtocolQueries';

// Very small PDF generator without external deps. Creates a single-page PDF
// with basic text content. This is a pragmatic placeholder until a DOCX→PDF
// solution is plugged in. It lists up to 4 rows of key items.

// IMPORTANT: PDF Type1 base fonts expect WinAnsi/Latin-1 compatible bytes for text
// shown with the Tj operator when using string literals in parentheses. Our first
// implementation accidentally wrote UTF-8, which produced garbled umlauts like
// "Schlˆ…ssel". We now normalize strings to Latin-1 and write the entire PDF as
// latin1 so that umlauts (äöüÄÖÜß) render correctly.

const PDF_TEXT_ENCODING: BufferEncoding = 'latin1';

const toLatin1 = (s: string): string => {
    // Map characters not representable in Latin-1 to reasonable fallbacks.
    // Common German characters are present in Latin-1; others fall back to '?'.
    const replacements: Record<string, string> = {
        // smart quotes / dashes
        '’': "'",
        '‘': "'",
        '‚': ',',
        '“': '"',
        '”': '"',
        '–': '-',
        '—': '-',
        '…': '...',
    };
    let out = '';
    for (const ch of s) {
        if (replacements[ch] !== undefined) {
            out += replacements[ch];
            continue;
        }
        const code = ch.codePointAt(0)!;
        if (code <= 0xff) {
            out += ch;
        } else {
            out += '?';
        }
    }
    return out;
};

const esc = (s: string) => toLatin1(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

type Line = string;

const buildContentStream = (lines: Array<Line>, fontSize = 12): { stream: string; height: number } => {
    const startY = 800; // start near top
    const leading = Math.round(fontSize * 1.5);
    let y = startY;
    const chunks: Array<string> = [];
    chunks.push('BT', `/F1 ${fontSize} Tf`);
    for (const line of lines) {
        if (y < 60) {
            break;
        } // avoid hitting footer
        chunks.push(`72 ${y} Td (${esc(line)}) Tj`);
        y -= leading;
    }
    chunks.push('ET');
    return { stream: chunks.join('\n'), height: startY - y };
};

const fmtAddress = (d: ProtocolDetails) => {
    const p = d.profile;
    if (!p) {
        return '';
    }
    const a = [p.addressStreet, p.addressHouseNumber].filter(Boolean).join(' ');
    const c = [p.addressZipCode, p.addressCity].filter(Boolean).join(' ');
    return [a, c].filter(Boolean).join(', ');
};

export const generateReceiptPdfBuffer = async (details: ProtocolDetails, issuerName: string): Promise<Buffer> => {
    const proto = details.protocol!;
    const p = details.profile;
    const isIssuance = proto.protocolType === 'issuance';

    const header = isIssuance ? 'Schlüssel-Ausgabequittung' : 'Schlüssel-Rückgabequittung';
    const name = p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : '';
    const profileNr = p?.profileNumber != null ? String(p.profileNumber) : '';
    const address = fmtAddress(details);
    const mail = p?.emailAddress ?? '';
    const phone = p?.phoneNumber ?? '';
    const protocolId = proto.id;
    const dateStr = new Date(proto.createdAt).toLocaleString('de-DE');

    const rows = details.items.slice(0, 4).map((it) => {
        const keyId = `${it.keyNr}-${it.seqNumber}`;
        const desc = it.description ?? '';
        return `• KeyId: ${keyId}    Beschreibung: ${desc}    Typ: Schlüssel    Anzahl: 1`;
    });

    const lines: Array<string> = [
        header,
        '',
        `Name: ${name}`,
        `ProfileNr: ${profileNr}`,
        `Address: ${address}`,
        `Mail: ${mail}`,
        `Phone: ${phone}`,
        `ProtocolId: ${protocolId}`,
        `Datum: ${dateStr}`,
        `Ausgegeben von: ${issuerName}`,
        '',
        'Schlüssel:',
        ...rows,
        '',
        'Unterschrift: ________________________________',
    ];

    const { stream } = buildContentStream(lines, 12);

    // Build minimal PDF objects
    // Object 1: Catalog
    // Object 2: Pages
    // Object 3: Page
    // Object 4: Font
    // Object 5: Content stream
    const objects: Array<string> = [];
    const xref: Array<number> = [];
    const pushObj = (s: string) => {
        const prevLen = Buffer.byteLength(pdfParts.join(''), PDF_TEXT_ENCODING);
        xref.push(prevLen);
        objects.push(s);
    };

    const contentBytes = Buffer.from(stream, PDF_TEXT_ENCODING);
    const contentLen = contentBytes.byteLength;

    const pdfParts: Array<string> = [];
    pdfParts.push('%PDF-1.4\n');

    // 1 0 obj: Catalog
    pushObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    // 2 0 obj: Pages
    pushObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

    // 3 0 obj: Page
    pushObj(
        '3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595 842] /Contents 5 0 R >>\nendobj\n',
    );

    // 4 0 obj: Font
    pushObj('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

    // 5 0 obj: Content stream
    pushObj(`5 0 obj\n<< /Length ${contentLen} >>\nstream\n${stream}\nendstream\nendobj\n`);

    // Write all
    const headerStr = pdfParts.join('');
    let body = headerStr;
    for (const obj of objects) {
        body += obj;
    }
    const xrefStart = Buffer.byteLength(body, PDF_TEXT_ENCODING);
    let xrefStr = `xref\n0 ${objects.length + 1}\n`;
    xrefStr += '0000000000 65535 f \n';
    for (const off of xref) {
        xrefStr += `${off.toString().padStart(10, '0')} 00000 n \n`;
    }
    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    const pdfString = body + xrefStr + trailer;
    return Buffer.from(pdfString, PDF_TEXT_ENCODING);
};

export default generateReceiptPdfBuffer;
