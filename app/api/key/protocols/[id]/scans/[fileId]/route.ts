import { NextResponse } from 'next/server';
import { getProtocolScan } from '@/lib/db/keyProtocolFileActions';
import { guardKeyRoute } from '@/lib/key/routeHelpers';
import { downloadFile } from '@/lib/nextcloud/webdav';

interface RouteContext {
    params: Promise<{ id: string; fileId: string }>;
}

// Streams a scan from Nextcloud, so access is decided by the Nexus role and not by Nextcloud shares.
export async function GET(_: Request, ctx: RouteContext): Promise<NextResponse> {
    const guard = await guardKeyRoute();
    if (guard instanceof NextResponse) {
        return guard;
    }

    const { id, fileId } = await ctx.params;
    const scan = await getProtocolScan(id, fileId);
    if (scan === null) {
        return NextResponse.json({ success: false, error: 'Den Scan gibt es nicht.' }, { status: 404 });
    }

    try {
        const file = await downloadFile(scan.filePath);
        const fileName = scan.filePath.split('/').pop() ?? 'scan';
        return new NextResponse(file.body, {
            headers: {
                'Content-Type': scan.contentType,
                'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
            },
        });
    } catch {
        return NextResponse.json({ success: false, error: 'Der Scan konnte nicht aus der Nextcloud geladen werden.' }, { status: 502 });
    }
}
