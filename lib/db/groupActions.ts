import { and, count, eq, isNull } from 'drizzle-orm';
import { inArray } from 'drizzle-orm/sql/expressions/conditions';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import type { Group } from '@/db/schema';
import { groupsTable, membersTable } from '@/db/schema';
import getUserSession from '@/lib/auth/getUserSession';
import { keycloakRemoveUserFromGroup } from '@/lib/keycloak/userActions';

export const getUserGroups = async (): Promise<Array<Group>> => {
    const userId = (await getUserSession())?.id ?? null;
    if (userId === null) {
        return [];
    }

    const memberships = await db.select().from(membersTable).where(eq(membersTable.userId, userId));
    const groupIds = memberships.map((membership) => membership.groupId);

    const groups = await db.select().from(groupsTable).where(inArray(groupsTable.id, groupIds));
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

const isGlobalAdmin = (userId: string): boolean => {
    // ToDo: Implement this function.
    return userId === '58722002-5ebc-4039-802f-01bb499978ae';
};

export const isGroupAdmin = async (userId: string, groupId: string, global: boolean = false): Promise<boolean> => {
    const groupAdminStatus = await getGroupAdminStatus(userId, groupId);
    if (groupAdminStatus === 'Admin') {
        return true;
    }

    return global ? isGlobalAdmin(userId) : false;
};

export const getGroupById = async (groupId: string): Promise<Group | null> => {
    const group = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
    return group[0] ?? null;
};

const removeUserFromDbGroup = async (userId: string, groupId: string): Promise<number> => {
    const result = await db
        .delete(membersTable)
        .where(and(eq(membersTable.userId, userId), eq(membersTable.groupId, groupId)))
        .returning();
    return result.length;
};

export const removeUserFromGroup = async (userIdToBeRemoved: string, groupId: string, executingUserId: string): Promise<NextResponse> => {
    const idpGroup = await getGroupById(groupId);
    if (idpGroup === null) {
        return NextResponse.json({ error: 'Die Gruppe konnte nicht gefunden werden.' }, { status: 400 });
    }

    const dbGroup = await getGroupById(groupId);
    if (dbGroup === null) {
        return NextResponse.json({ error: 'Die Gruppe konnte nicht gefunden werden.' }, { status: 400 });
    }

    const adminStatus = await isGroupAdmin(executingUserId, groupId, true);
    if (!adminStatus) {
        return NextResponse.json({ error: 'Dir fehlen die erforderlichen Rechte um diese Aktion durchzuführen.' }, { status: 403 });
    }

    const userIsMemberOfGroup = await getGroupAdminStatus(userIdToBeRemoved, groupId);
    if (userIsMemberOfGroup === 'None') {
        return NextResponse.json({ error: 'Der Benutzer*in ist nicht Teil dieser Gruppe.' }, { status: 400 });
    }

    if (userIsMemberOfGroup === 'Admin' && dbGroup.adminGroup !== null) {
        await keycloakRemoveUserFromGroup(userIdToBeRemoved, dbGroup.adminGroup);
        await removeUserFromDbGroup(userIdToBeRemoved, dbGroup.id);
    }

    if (userIsMemberOfGroup === 'Member' && dbGroup.memberGroup !== null) {
        await keycloakRemoveUserFromGroup(userIdToBeRemoved, dbGroup.memberGroup);
        await removeUserFromDbGroup(userIdToBeRemoved, dbGroup.id);
    }

    // ToDo: Force a refresh in our other tools.
    // ToDo: Log the event.
    return NextResponse.json({ success: true });
};
