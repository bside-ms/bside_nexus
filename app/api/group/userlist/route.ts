import { NextResponse } from 'next/server';
import { getPossibleGroupMembers } from '@/lib/db/userActions';

export async function POST(req: Request): Promise<NextResponse> {
    const { groupId }: { groupId: string } = await req.json();
    if (groupId === undefined) {
        return NextResponse.json({ error: 'Die Gruppe konnte nicht identifiziert werden.' }, { status: 400 });
    }

    const users = await getPossibleGroupMembers(groupId);

    const userList = users.map((user) => ({
        id: user.id,
        name: user.username,
        displayName: user.displayName ?? user.username,
    }));

    userList.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return NextResponse.json(userList, { status: 200 });
}
