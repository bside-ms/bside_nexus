import isEmpty from 'lodash-es/isEmpty';
import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { removeUserFromGroup } from '@/lib/db/groupActions';

export async function POST(req: Request): Promise<NextResponse> {
    try {
        const user = await getUserSession();

        if (!user) {
            return NextResponse.json({ error: 'Du bist nicht eingeloggt.' }, { status: 401 });
        }

        const userId = user.id;
        if (!userId) {
            return NextResponse.json({ error: 'Die eingeloggte Benutzer*in konnte nicht identifiziert werden.' }, { status: 400 });
        }

        const { userIdToBeRemoved, groupId }: { userIdToBeRemoved: string; groupId: string } = await req.json();

        if (isEmpty(userIdToBeRemoved) || isEmpty(groupId)) {
            return NextResponse.json({ error: 'Die Benutzer*in oder die Gruppe konnte nicht identifiziert werden.' }, { status: 400 });
        }

        return removeUserFromGroup(userIdToBeRemoved, groupId, userId);
    } catch (error: unknown) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Die Benutzer*in konnte nicht aus der Gruppe entfernt werden.',
            },
            { status: 500 },
        );
    }
}
