import isEmpty from 'lodash-es/isEmpty';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { removeAdminFromGroup } from '@/lib/groups';
import { getClientIP } from '@/lib/utils/getClientIP';

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const user = await getUserSession();

        if (!user) {
            return NextResponse.json({ error: 'Du bist nicht eingeloggt.' }, { status: 401 });
        }

        const userId = user.id;
        if (!userId) {
            return NextResponse.json({ error: 'Die eingeloggte Benutzer*in konnte nicht identifiziert werden.' }, { status: 400 });
        }

        const {
            userIdToBeDemoted,
            groupId,
            allowWithoutAdmin,
        }: { userIdToBeDemoted: string; groupId: string; allowWithoutAdmin?: boolean } = await req.json();

        if (isEmpty(userIdToBeDemoted) || isEmpty(groupId)) {
            return NextResponse.json({ error: 'Die Benutzer*in oder die Gruppe konnte nicht identifiziert werden.' }, { status: 400 });
        }

        const ipAddress = getClientIP(req);
        return removeAdminFromGroup(userIdToBeDemoted, groupId, userId, ipAddress, allowWithoutAdmin === true);
    } catch (error: unknown) {
        // Do not pass the message on, it can contain internals from Keycloak or the database.
        // eslint-disable-next-line no-console
        console.error('[api/group/demote]', error);
        return NextResponse.json(
            {
                error: 'Die Benutzer*in konnte nicht aus der Gruppe der Administrator*innen entfernt werden.',
            },
            { status: 500 },
        );
    }
}
