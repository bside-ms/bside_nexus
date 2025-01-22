import { and, count, eq, isNull } from 'drizzle-orm';
import { inArray } from 'drizzle-orm/sql/expressions/conditions';
import { db } from '@/db';
import type { Group } from '@/db/schema';
import { groupsTable, membersTable } from '@/db/schema';
import getUserSession from '@/lib/auth/getUserSession';

const generateGroupPathsFromSession = (paths: Array<string>): Array<string> => {
    const filteredPaths = paths.filter((path) => path.endsWith('/mitglieder') || path.endsWith('/admin'));

    const cleanedPaths = filteredPaths.map(
        (path) => path.replace(/\/(mitglieder|admin)$/, ''), // Regex to remove '/mitglieder' or '/admin' at the end
    );

    return Array.from(new Set(cleanedPaths));
};

export const getUserGroups = async (): Promise<Array<Group>> => {
    const keycloakGroupPaths = (await getUserSession())?.keycloakGroups ?? [];
    const paths = generateGroupPathsFromSession(keycloakGroupPaths);

    const groups = await db.select().from(groupsTable).where(inArray(groupsTable.path, paths));
    return (groups as Array<Group>) ?? [];
};

export const getAllGroups = async (): Promise<Array<Group>> => {
    const groups = await db.select().from(groupsTable).where(isNull(groupsTable.parentGroup));
    return (groups as Array<Group>) ?? [];
};

/*
 *
 */

export const getGroupMemberCount = async (groupId: string): Promise<number> => {
    const groupMembers = await db.select({ count: count() }).from(membersTable).where(eq(membersTable.groupId, groupId));
    return groupMembers[0]?.count ?? 0;
};

// Returns the number of admins in the group.
export type GroupAdminStatus = 'Admin' | 'Member' | 'None';

export const getGroupAdminStatus = async (userId: string, groupId: string): Promise<GroupAdminStatus> => {
    const groupMembers = await db
        .select()
        .from(membersTable)
        .where(and(eq(membersTable.userId, userId), eq(membersTable.groupId, groupId)))
        .limit(1);

    if (groupMembers.length === 0) {
        return 'None';
    }

    const groupMember = groupMembers[0];
    switch (groupMember?.isAdmin) {
        case true:
            return 'Admin';
        case false:
            return 'Member';
        default:
            return 'None';
    }
};

export const getSubgroups = async (groupId: string): Promise<Array<Group>> => {
    const subgroups = await db.select().from(groupsTable).where(eq(groupsTable.parentGroup, groupId));
    return (subgroups as Array<Group>) ?? [];
};
