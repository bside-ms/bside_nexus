import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/db/userActions';

export async function POST(_: Request): Promise<NextResponse> {
    const users = await getAllUsers();

    const userList = users.map((user) => ({
        id: user.id,
        name: user.username,
        displayName: user.displayName ?? user.username,
    }));

    userList.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return NextResponse.json(userList, { status: 200 });
}
