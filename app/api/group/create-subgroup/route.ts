import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { createSubgroup } from '@/lib/groupAdmin';
import { handleSystemAdminPost } from '@/lib/systemAdminRoute';
import { subgroupCreateSchema } from '@/lib/validation/groupSchemas';

export async function POST(req: NextRequest): Promise<NextResponse> {
    return handleSystemAdminPost(
        req,
        subgroupCreateSchema,
        'api/group/create-subgroup',
        'Die Untergruppe konnte nicht erstellt werden.',
        createSubgroup,
    );
}
