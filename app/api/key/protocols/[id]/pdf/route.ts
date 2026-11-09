import { NextResponse } from 'next/server';
import { getProtocolDetails } from '@/lib/db/keyProtocolActions';
import { guardKeyRoute } from '@/lib/key/routeHelpers';
import { isDocxEnabled, renderDocxPdfOrNull } from '@/lib/pdf/renderProtocolPdf';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// Renders the receipt of an issuance or return as PDF.
export async function GET(_: Request, ctx: RouteContext): Promise<NextResponse> {
    const guard = await guardKeyRoute();
    if (guard instanceof NextResponse) {
        return guard;
    }

    const { id } = await ctx.params;
    const details = await getProtocolDetails(id);
    if (details === null) {
        return NextResponse.json({ success: false, error: 'Das Protokoll gibt es nicht.' }, { status: 404 });
    }
    if (details.protocolType === 'lost') {
        return NextResponse.json({ success: false, error: 'Für Verlustmeldungen gibt es keine Quittung.' }, { status: 400 });
    }

    if (!isDocxEnabled()) {
        return NextResponse.json(
            {
                success: false,
                error: 'Die PDF-Erzeugung ist deaktiviert.',
                hint: 'Setze PDF_DOCX_ENABLED=true (oder yes/1/on) und stelle sicher, dass soffice verfügbar ist.',
            },
            { status: 503 },
        );
    }

    const pdfBuffer = await renderDocxPdfOrNull(details);
    if (!pdfBuffer) {
        return NextResponse.json(
            {
                success: false,
                error: 'Die PDF-Erzeugung ist fehlgeschlagen.',
                hint: 'Ist LibreOffice/soffice installiert und im PATH? Stimmen Vorlagenpfad und Platzhalter?',
            },
            { status: 500 },
        );
    }

    const typeName = details.protocolType === 'issuance' ? 'Ausgabe' : 'Rueckgabe';
    const fileName = `Schluessel-${typeName}-${details.protocol.protocolNumber}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': String(pdfBuffer.byteLength),
        },
        status: 200,
    });
}
