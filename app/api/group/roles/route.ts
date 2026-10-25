import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getGroupRoles } from '@/lib/groupRoles';
import { requireSystemAdmin } from '@/lib/systemAdminRoute';
import isEmptyString from '@/lib/utils/isEmptyString';

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const executingUserId = await requireSystemAdmin();
        if (executingUserId instanceof NextResponse) {
            return executingUserId;
        }

        const groupId = req.nextUrl.searchParams.get('groupId') ?? '';
        if (isEmptyString(groupId)) {
            return NextResponse.json({ error: 'Die Gruppe konnte nicht identifiziert werden.' }, { status: 400 });
        }

        return await getGroupRoles(groupId, req.nextUrl.searchParams.get('options') === 'true');
    } catch (error: unknown) {
        // Do not pass the message on, it can contain internals from Keycloak.
        // eslint-disable-next-line no-console
        console.error('[api/group/roles]', error);
        return NextResponse.json({ error: 'Die Rollen konnten nicht geladen werden.' }, { status: 500 });
    }
}
