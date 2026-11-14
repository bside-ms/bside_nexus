import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { checkNextcloudFolders } from '@/lib/nextcloud/webdav';
import { handleSystemAdminPost } from '@/lib/systemAdminRoute';
import { z } from '@/lib/zod';

// Read-only check of the Nextcloud folders.
export async function POST(req: NextRequest): Promise<NextResponse> {
    return handleSystemAdminPost(
        req,
        z.object({}),
        'api/admin/integrations/nextcloud',
        'Die Nextcloud konnte nicht geprüft werden.',
        async () => {
            const folders = await checkNextcloudFolders();
            if (folders === null) {
                return NextResponse.json({ success: false, error: 'Die Nextcloud ist nicht konfiguriert.' }, { status: 400 });
            }
            return NextResponse.json({ success: true, folders });
        },
    );
}
