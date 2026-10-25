import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { changeGroupSettings } from '@/lib/groupAdmin';
import { handleSystemAdminPost } from '@/lib/systemAdminRoute';
import { groupSettingsSchema } from '@/lib/validation/groupSchemas';

export async function POST(req: NextRequest): Promise<NextResponse> {
    return handleSystemAdminPost(
        req,
        groupSettingsSchema,
        'api/group/settings',
        'Die Einstellungen konnten nicht gespeichert werden.',
        changeGroupSettings,
    );
}
