import { NextResponse } from 'next/server';
import { addProtocolScan } from '@/lib/db/keyProtocolFileActions';
import { errorResponse, guardKeyRoute, writeKeyLog } from '@/lib/key/routeHelpers';
import { isNextcloudConfigured } from '@/lib/nextcloud/webdav';
import { parseOrError, protocolScanSchema } from '@/lib/validation/keySchemas';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// Uploads the signed scan of a receipt (multipart: file, date).
export async function POST(req: Request, ctx: RouteContext): Promise<NextResponse> {
    const guard = await guardKeyRoute();
    if (guard instanceof NextResponse) {
        return guard;
    }
    if (!isNextcloudConfigured()) {
        return NextResponse.json({ success: false, error: 'Die Nextcloud-Anbindung ist nicht eingerichtet.' }, { status: 503 });
    }

    const form = await req.formData().catch(() => null);
    const file = form?.get('file');
    if (!(file instanceof File)) {
        return NextResponse.json({ success: false, error: 'Bitte wähle eine Datei aus.' }, { status: 400 });
    }
    const parsed = parseOrError(protocolScanSchema, { date: form?.get('date') ?? '' });
    if (!parsed.ok) {
        return NextResponse.json({ success: false, error: parsed.error.issues?.[0]?.message ?? 'Ungültiges Datum.' }, { status: 400 });
    }

    try {
        const { id } = await ctx.params;
        const scan = await addProtocolScan(
            {
                protocolId: id,
                data: await file.arrayBuffer(),
                contentType: file.type,
                originalName: file.name === '' ? null : file.name.slice(0, 255),
                protocolDate: parsed.data.date,
            },
            guard,
        );
        await writeKeyLog(req, guard, 'key.protocol.scan', `Scan hochgeladen: ${scan.filePath}`);
        return NextResponse.json({ success: true, id: scan.id }, { status: 201 });
    } catch (error) {
        return errorResponse(error, 'Der Scan konnte nicht hochgeladen werden.');
    }
}
