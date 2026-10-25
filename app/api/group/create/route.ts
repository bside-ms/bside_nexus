import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { createGroup } from '@/lib/groupAdmin';
import { handleSystemAdminPost } from '@/lib/systemAdminRoute';
import { groupCreateSchema } from '@/lib/validation/groupSchemas';

export async function POST(req: NextRequest): Promise<NextResponse> {
    return handleSystemAdminPost(req, groupCreateSchema, 'api/group/create', 'Die Gruppe konnte nicht erstellt werden.', createGroup);
}
