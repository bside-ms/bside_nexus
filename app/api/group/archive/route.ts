import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { setGroupArchived } from '@/lib/groupAdmin';
import { handleSystemAdminPost } from '@/lib/systemAdminRoute';
import { groupArchiveSchema } from '@/lib/validation/groupSchemas';

export async function POST(req: NextRequest): Promise<NextResponse> {
    return handleSystemAdminPost(
        req,
        groupArchiveSchema,
        'api/group/archive',
        'Der Archiv-Status konnte nicht geändert werden.',
        setGroupArchived,
    );
}
