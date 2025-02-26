import { eq } from 'drizzle-orm';
import { db } from '@/db';
import type { User } from '@/db/schema';
import { usersTable } from '@/db/schema';

export const getAllUsers = async (): Promise<Array<User>> => {
    const users = await db.select().from(usersTable).where(eq(usersTable.enabled, true));
    return (users as Array<User>) ?? [];
};
