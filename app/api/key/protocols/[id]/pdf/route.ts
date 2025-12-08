import { type NextRequest, NextResponse } from 'next/server';
import requireRole from '@/lib/auth/requireRole';
import { getProtocolDetails } from '@/lib/db/keyProtocolQueries';
import { isDocxEnabled, renderDocxPdfOrNull } from '@/lib/pdf/renderProtocolPdf';

// PDF-Download-Endpoint: erzeugt eine einfache PDF-Quittung basierend auf den Protokolldaten.
export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await ctx.params;
    const details = await getProtocolDetails(id);
    if (!details.protocol) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const issuerName = guard.displayName ?? '—';

    // Enforce DOCX→PDF only (no fallback). If disabled or conversion fails, return an error.
    if (!isDocxEnabled()) {
        return NextResponse.json(
            {
                error: 'DOCX→PDF ist deaktiviert',
                hint: 'Setze PDF_DOCX_ENABLED=true (oder yes/1/on) und stelle sicher, dass soffice verfügbar ist.',
            },
            { status: 503 },
        );
    }

    const pdfBuffer = await renderDocxPdfOrNull(details, issuerName);
    if (!pdfBuffer) {
        return NextResponse.json(
            {
                error: 'DOCX→PDF-Konvertierung fehlgeschlagen',
                hint: 'Ist LibreOffice/soffice installiert und im PATH? Stimmt der Template-Pfad und sind die Platzhalter korrekt?',
            },
            { status: 500 },
        );
    }
    const fileName = `protocol-${details.protocol.id}.pdf`;
    // @ts-expect-error Buffer does not perfectly overlap with BodyInit.
    return new NextResponse(pdfBuffer, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': String(pdfBuffer.byteLength),
        },
        status: 200,
    });
}
