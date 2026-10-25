import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { moveGroupRole } from '@/lib/groupRoles';
import { handleSystemAdminPost } from '@/lib/systemAdminRoute';
import { groupRoleMoveSchema } from '@/lib/validation/groupSchemas';

export async function POST(req: NextRequest): Promise<NextResponse> {
    return handleSystemAdminPost(
        req,
        groupRoleMoveSchema,
        'api/group/roles/move',
        'Die Rolle konnte nicht verschoben werden.',
        moveGroupRole,
    );
}
