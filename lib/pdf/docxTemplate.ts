/* eslint-disable no-template-curly-in-string */

import type { ProtocolDetails } from '@/lib/db/keyProtocolQueries';
import JSZip from 'jszip';
import fs from 'node:fs/promises';
import path from 'node:path';

export type ReceiptPlaceholders = Record<string, string>;

export type TemplateKind = 'issuance' | 'return';

export const getTemplateAbsolutePath = (kind: TemplateKind): string => {
    const file = kind === 'issuance' ? 'IssuerTemplate.docx' : 'ReturnTemplate.docx';
    return path.join(process.cwd(), 'public', 'pdfTemplates', file);
};

export const buildReceiptPlaceholders = (details: ProtocolDetails, issuerName: string): ReceiptPlaceholders => {
    const p = details.profile;
    const proto = details.protocol!;
    const name = p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : '';
    const profileNr = p !== null && p?.profileNumber !== null ? String(p.profileNumber) : '';
    const address = [
        [p?.addressStreet, p?.addressHouseNumber].filter(Boolean).join(' '),
        [p?.addressZipCode, p?.addressCity].filter(Boolean).join(' '),
    ]
        .filter((s) => (s ?? '').length > 0)
        .join(', ');

    const mail = p?.emailAddress ?? '';
    const phone = p?.phoneNumber ?? '';
    const protocolId = proto.id;

    // Base fields
    const placeholders: ReceiptPlaceholders = {
        '${Name}': name,
        '${ProfileNr}': profileNr,
        '${Address}': address,
        '${Mail}': mail,
        '${Phone}': phone,
        '${IssuerName}': issuerName ?? '',
        '${ProtocolId}': protocolId,
    };

    // Up to 4 rows
    const items = details.items.slice(0, 4);
    for (let i = 0; i < 4; i++) {
        const idx = i + 1;
        const it = items[i];
        const keyId = it ? `${it.keyNr}-${it.seqNumber}` : '';
        const desc = it?.description ?? '';
        const kKeyId = `\${R${idx}KeyId}`;
        const kDesc = `\${R${idx}Description}`;
        const kType = `\${R${idx}KeyType}`;
        const kQty = `\${R${idx}Quantity}`;
        placeholders[kKeyId] = keyId;
        placeholders[kDesc] = desc;
        placeholders[kType] = it ? 'Schlüssel' : '';
        placeholders[kQty] = it ? '1' : '';
    }

    // Ensure the base keys exist
    placeholders['${Name}'] = placeholders['${Name}'] ?? '';
    placeholders['${ProfileNr}'] = placeholders['${ProfileNr}'] ?? '';
    placeholders['${Address}'] = placeholders['${Address}'] ?? '';
    placeholders['${Mail}'] = placeholders['${Mail}'] ?? '';
    placeholders['${Phone}'] = placeholders['${Phone}'] ?? '';
    placeholders['${IssuerName}'] = placeholders['${IssuerName}'] ?? '';
    placeholders['${ProtocolId}'] = placeholders['${ProtocolId}'] ?? '';

    return placeholders;
};

const escapeXml = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/**
 * Fills a DOCX template by performing simple string replacements in word/document.xml
 * for placeholders like ${Name}. Note: Placeholders must not be split across runs
 * in the template file. If they are, Word may break them; keep each placeholder
 * within a single run to ensure replacement works.
 */
export const fillDocxTemplate = async (templateAbsPath: string, placeholders: ReceiptPlaceholders): Promise<Buffer> => {
    const input = await fs.readFile(templateAbsPath);
    const zip = await JSZip.loadAsync(input);

    const docXmlPath = 'word/document.xml';
    const docXmlFile = zip.file(docXmlPath);
    if (!docXmlFile) {
        throw new Error('Template document.xml not found in DOCX');
    }

    let xml = await docXmlFile.async('string');
    // Replace all placeholders
    for (const [key, val] of Object.entries(placeholders)) {
        if (!key) {
            continue;
        }
        const safeVal = (val ?? '').toString();
        // Replace all occurrences
        xml = xml.split(key).join(escapeXml(safeVal));
    }
    zip.file(docXmlPath, xml);

    const output = await zip.generateAsync({ type: 'nodebuffer' });
    return output;
};

export default fillDocxTemplate;
