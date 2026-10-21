import isEmpty from 'lodash-es/isEmpty';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { MAX_USERS_PER_ADD } from '@/lib/constants';
import { addUsersToGroup } from '@/lib/groups';
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

        const { userIdsToBeAdded, groupId }: { userIdsToBeAdded: unknown; groupId: string } = await req.json();

        if (Array.isArray(userIdsToBeAdded) && userIdsToBeAdded.length > MAX_USERS_PER_ADD) {
            return NextResponse.json(
                { error: `Du kannst höchstens ${MAX_USERS_PER_ADD} Personen auf einmal hinzufügen.` },
                { status: 400 },
            );
        }

        const isValidUserIdList =
            Array.isArray(userIdsToBeAdded) &&
            userIdsToBeAdded.length > 0 &&
            userIdsToBeAdded.length <= MAX_USERS_PER_ADD &&
            userIdsToBeAdded.every((id) => typeof id === 'string' && !isEmpty(id));

        if (!isValidUserIdList || isEmpty(groupId)) {
            return NextResponse.json({ error: 'Die Benutzer*innen oder die Gruppe konnten nicht identifiziert werden.' }, { status: 400 });
        }

        const ipAddress = getClientIP(req);
        return addUsersToGroup(userIdsToBeAdded as Array<string>, groupId, userId, ipAddress);
    } catch (error: unknown) {
        // Do not pass the message on, it can contain internals from Keycloak or the database.
        // eslint-disable-next-line no-console
        console.error('[api/group/add]', error);
        return NextResponse.json({ error: 'Die Benutzer*innen konnten nicht zur Gruppe hinzugefügt werden.' }, { status: 500 });
    }
}
