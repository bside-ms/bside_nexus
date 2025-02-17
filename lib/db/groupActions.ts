import { and, count, eq, isNull } from 'drizzle-orm';
import { inArray } from 'drizzle-orm/sql/expressions/conditions';
import { isEmpty } from 'lodash-es';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import type { Group, User } from '@/db/schema';
import { usersTable } from '@/db/schema';
import { groupsTable, membersTable } from '@/db/schema';
import getUserSession from '@/lib/auth/getUserSession';
import { keycloakAddUserToGroup, keycloakRemoveUserFromGroup } from '@/lib/keycloak/userActions';

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

export type GroupMember = User & {
    isAdmin: boolean;
};

export const getGroup = async (groupId: string): Promise<Group | null> => {
    const group = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
    return group[0] ?? null;
};

export const getGroupMembers = async (groupId: string): Promise<Array<GroupMember>> => {
    const groupMembers = await db
        .select()
        .from(membersTable)
        .leftJoin(usersTable, eq(membersTable.userId, usersTable.id))
        .where(eq(membersTable.groupId, groupId));

    if (groupMembers.length === 0) {
        return [];
    }

    const users: Array<GroupMember> = [];
    groupMembers.forEach((member) => {
        if (member.users === null) {
            return;
        }

        const groupMember: GroupMember = {
            ...member.users,
            isAdmin: member.members.isAdmin,
        };

        users.push(groupMember);
    });

    return users;
};

export const getGroupMemberCount = async (groupId: string): Promise<number> => {
    const groupMembers = await db.select({ count: count() }).from(membersTable).where(eq(membersTable.groupId, groupId));
    return groupMembers[0]?.count ?? 0;
};

// Returns the number of admins in the group.
export type GroupAdminStatus = 'Admin' | 'Member' | 'None';
export const getGroupAdminStatus = async (userId: string, groupId: string): Promise<GroupAdminStatus> => {
    if (isEmpty(userId) || isEmpty(groupId)) {
        return 'None';
    }

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

const addAdminToDbGroup = async (userId: string, groupId: string): Promise<number> => {
    const status = await getGroupAdminStatus(userId, groupId);
    if (status === 'Admin') {
        return 0;
    }

    if (status === 'Member') {
        const updateQuery = await db
            .update(membersTable)
            .set({ isAdmin: true })
            .where(and(eq(membersTable.userId, userId), eq(membersTable.groupId, groupId)))
            .returning();
        return updateQuery.length;
    }

    const insertQuery = await db
        .insert(membersTable)
        .values({
            userId,
            groupId,
            isAdmin: true,
        })
        .returning();
    return insertQuery.length;
};

const removeAdminFromDbGroup = async (userId: string, groupId: string): Promise<number> => {
    const status = await getGroupAdminStatus(userId, groupId);
    if (status !== 'Admin') {
        return 0;
    }

    const result = await db
        .update(membersTable)
        .set({ isAdmin: false })
        .where(and(eq(membersTable.userId, userId), eq(membersTable.groupId, groupId)))
        .returning();
    return result.length;
};

/**
 * Demotes a user from an admin in a group.
 * This function is triggered by the /apu/group/demote endpoint.
 * @param userIdToBeDemoted
 * @param groupId
 * @param executingUserId
 */
export const removeAdminFromGroup = async (userIdToBeDemoted: string, groupId: string, executingUserId: string): Promise<NextResponse> => {
    const idpGroup = await getGroupById(groupId);
    if (idpGroup === null) {
        return NextResponse.json({ error: 'Die Gruppe konnte nicht gefunden werden.' }, { status: 400 });
    }

    const dbGroup = await getGroupById(groupId);
    if (dbGroup === null || dbGroup.adminGroup === null) {
        return NextResponse.json({ error: 'Die Gruppe konnte nicht gefunden werden.' }, { status: 400 });
    }

    const adminStatus = await isGroupAdmin(executingUserId, groupId, true);
    if (!adminStatus) {
        return NextResponse.json({ error: 'Dir fehlen die erforderlichen Rechte um diese Aktion durchzuführen.' }, { status: 403 });
    }

    const userIsMemberOfGroup = await getGroupAdminStatus(userIdToBeDemoted, groupId);
    if (userIsMemberOfGroup !== 'Admin') {
        return NextResponse.json({ error: 'Die Administrator*in konnte nicht entfernt werden.' }, { status: 400 });
    }

    await keycloakRemoveUserFromGroup(userIdToBeDemoted, dbGroup.adminGroup);
    await removeAdminFromDbGroup(userIdToBeDemoted, dbGroup.id);

    // ToDo: Force a refresh in our other tools.
    // ToDo: Log the event.

    return NextResponse.json({ success: true });
};

/**
 * Promotes a user to an admin in a group.
 * This function is triggered by the /apu/group/promote endpoint.
 * @param userIdToBePromoted
 * @param groupId
 * @param executingUserId
 */
export const addAdminToGroup = async (userIdToBePromoted: string, groupId: string, executingUserId: string): Promise<NextResponse> => {
    const idpGroup = await getGroupById(groupId);
    if (idpGroup === null) {
        return NextResponse.json({ error: 'Die Gruppe konnte nicht gefunden werden.' }, { status: 400 });
    }

    const dbGroup = await getGroupById(groupId);
    if (dbGroup === null || dbGroup.adminGroup === null) {
        return NextResponse.json({ error: 'Die Gruppe konnte nicht gefunden werden.' }, { status: 400 });
    }

    const adminStatus = await isGroupAdmin(executingUserId, groupId, true);
    if (!adminStatus) {
        return NextResponse.json({ error: 'Dir fehlen die erforderlichen Rechte um diese Aktion durchzuführen.' }, { status: 403 });
    }

    const userIsMemberOfGroup = await getGroupAdminStatus(userIdToBePromoted, groupId);
    if (userIsMemberOfGroup !== 'Member') {
        return NextResponse.json({ error: 'Die Benutzer*in kann nicht zur Administrator*innen ernannt werden.' }, { status: 400 });
    }

    await keycloakAddUserToGroup(userIdToBePromoted, dbGroup.adminGroup);
    await addAdminToDbGroup(userIdToBePromoted, dbGroup.id);

    // ToDo: Force a refresh in our other tools.
    // ToDo: Log the event.

    return NextResponse.json({ success: true });
};

/**
 * Removes a user from a group.
 * This function is triggered by the /apu/group/remove endpoint.
 * @param userIdToBeRemoved
 * @param groupId
 * @param executingUserId
 */
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
        return NextResponse.json({ error: 'Die Benutzer*in ist nicht Teil dieser Gruppe.' }, { status: 400 });
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
