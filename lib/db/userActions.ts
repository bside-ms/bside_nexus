import { eq } from 'drizzle-orm';
import { db } from '@/db';
import type { User } from '@/db/schema';
import { usersTable } from '@/db/schema';
import { getGroupMembers } from '@/lib/db/groupActions';

export const getAllUsers = async (): Promise<Array<User>> => {
    const users = await db.select().from(usersTable).where(eq(usersTable.enabled, true));
    return (users as Array<User>) ?? [];
};

export const getPossibleGroupMembers = async (groupId: string): Promise<Array<User>> => {
    const allUsers = await db.select().from(usersTable).where(eq(usersTable.enabled, true));

    const members = await getGroupMembers(groupId);
    const memberIds = members.map((member) => member.id);

    return allUsers.filter((user) => !memberIds.includes(user.id));
};
