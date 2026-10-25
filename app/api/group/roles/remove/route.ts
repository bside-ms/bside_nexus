import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { removeGroupRole } from '@/lib/groupRoles';
import { handleSystemAdminPost } from '@/lib/systemAdminRoute';
import { groupRoleRemoveSchema } from '@/lib/validation/groupSchemas';

export async function POST(req: NextRequest): Promise<NextResponse> {
    return handleSystemAdminPost(
        req,
        groupRoleRemoveSchema,
        'api/group/roles/remove',
        'Die Rolle konnte nicht entfernt werden.',
        removeGroupRole,
    );
}
