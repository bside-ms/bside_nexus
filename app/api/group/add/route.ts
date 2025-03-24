import isEmpty from 'lodash-es/isEmpty';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { addUserToGroup } from '@/lib/db/groupActions';
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

        const { userIdToBeAdded, groupId }: { userIdToBeAdded: string; groupId: string } = await req.json();

        if (isEmpty(userIdToBeAdded) || isEmpty(groupId)) {
            return NextResponse.json({ error: 'Die Benutzer*in oder die Gruppe konnte nicht identifiziert werden.' }, { status: 400 });
        }

        const ipAddress = getClientIP(req);
        return addUserToGroup(userIdToBeAdded, groupId, userId, ipAddress);
    } catch (error: unknown) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Die Benutzer*in konnte nicht zur Gruppe hinzugefügt werden.' },
            { status: 500 },
        );
    }
}
