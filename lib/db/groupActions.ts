import { and, count, eq, isNull } from 'drizzle-orm';
import { inArray } from 'drizzle-orm/sql/expressions/conditions';
import { isEmpty } from 'lodash-es';
import { db } from '@/db';
import type { Group, User } from '@/db/schema';
import { usersTable } from '@/db/schema';
import { groupsTable, membersTable } from '@/db/schema';
import getUserSession from '@/lib/auth/getUserSession';

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
        .where(and(eq(membersTable.groupId, groupId), eq(usersTable.enabled, true)));

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

const isGlobalAdmin = (userId: string): boolean => {
    // ToDo: Implement this function.
    return userId === '58722002-5ebc-4039-802f-01bb499978ae';
};

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

export const addUserToDbGroup = async (userId: string, groupId: string): Promise<number> => {
    const result = await db
        .insert(membersTable)
        .values({
            userId,
            groupId,
            isAdmin: false,
        })
        .returning();
    return result.length;
};

export const removeUserFromDbGroup = async (userId: string, groupId: string): Promise<number> => {
    const result = await db
        .delete(membersTable)
        .where(and(eq(membersTable.userId, userId), eq(membersTable.groupId, groupId)))
        .returning();
    return result.length;
};

export const addAdminToDbGroup = async (userId: string, groupId: string): Promise<number> => {
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

export const removeAdminFromDbGroup = async (userId: string, groupId: string): Promise<number> => {
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

export const updateDescription = async (groupId: string, description?: string): Promise<number> => {
    const newDescription = isEmpty(description) ? null : description;
    const result = await db.update(groupsTable).set({ description: newDescription }).where(eq(groupsTable.id, groupId)).returning();
    return result.length;
};

export const updateWebsiteLink = async (groupId: string, websiteLink?: string): Promise<number> => {
    const newWebsiteLink = isEmpty(websiteLink) ? null : websiteLink;
    const result = await db.update(groupsTable).set({ websiteLink: newWebsiteLink }).where(eq(groupsTable.id, groupId)).returning();
    return result.length;
};

export const updateWikiLink = async (groupId: string, wikiLink?: string): Promise<number> => {
    const newWikiLink = isEmpty(wikiLink) ? null : wikiLink;
    const result = await db.update(groupsTable).set({ wikiLink: newWikiLink }).where(eq(groupsTable.id, groupId)).returning();
    return result.length;
};
