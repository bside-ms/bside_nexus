import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { addGroupRole } from '@/lib/groupRoles';
import { handleSystemAdminPost } from '@/lib/systemAdminRoute';
import { groupRoleAddSchema } from '@/lib/validation/groupSchemas';

export async function POST(req: NextRequest): Promise<NextResponse> {
    return handleSystemAdminPost(req, groupRoleAddSchema, 'api/group/roles/add', 'Die Rolle konnte nicht vergeben werden.', addGroupRole);
}
