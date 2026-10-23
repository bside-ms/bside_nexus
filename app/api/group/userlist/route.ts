import isEmpty from 'lodash-es/isEmpty';
import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { canManageGroup, getGroupById } from '@/lib/db/groupActions';
import { getPossibleGroupMembers } from '@/lib/db/userActions';
import isNotEmptyString from '@/lib/utils/isNotEmptyString';

// Users who can be added to the group.
export async function POST(req: Request): Promise<NextResponse> {
    try {
        const userId = (await getUserSession())?.id;

        if (!isNotEmptyString(userId)) {
            return NextResponse.json({ error: 'Du bist nicht eingeloggt.' }, { status: 401 });
        }

        const { groupId }: { groupId: string } = await req.json();
        if (isEmpty(groupId)) {
            return NextResponse.json({ error: 'Die Gruppe konnte nicht identifiziert werden.' }, { status: 400 });
        }

        const group = await getGroupById(groupId);
        if (group === null) {
            return NextResponse.json({ error: 'Die Gruppe konnte nicht gefunden werden.' }, { status: 400 });
        }

        if (!(await canManageGroup(userId, group))) {
            return NextResponse.json({ error: 'Dir fehlen die erforderlichen Rechte, um diese Aktion durchzuführen.' }, { status: 403 });
        }

        const users = await getPossibleGroupMembers(groupId);

        const userList = users.map((possibleMember) => ({
            id: possibleMember.id,
            name: possibleMember.username,
            displayName: possibleMember.displayName ?? possibleMember.username,
        }));

        userList.sort((a, b) => a.displayName.localeCompare(b.displayName, 'de', { sensitivity: 'base' }));

        return NextResponse.json(userList, { status: 200 });
    } catch (error: unknown) {
        // eslint-disable-next-line no-console
        console.error('[api/group/userlist]', error);
        return NextResponse.json({ error: 'Die Liste der Benutzer*innen konnte nicht geladen werden.' }, { status: 500 });
    }
}
