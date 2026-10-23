import { and, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm';
import { isEmpty } from 'lodash-es';
import 'dotenv/config';
import { db } from '@/db/index';
import { groupsTable, membersTable, usersTable } from '@/db/schema';
import type { AugmentedGroupRepresentation } from '@/lib/keycloak/groupActions';
import { keycloakGetAllGroups, keycloakGetDirectMembers } from '@/lib/keycloak/groupActions';
import { type AugmentedUserRepresentation, keycloakGetAllUsers } from '@/lib/keycloak/userActions';

const upsertGroup = async (entry: typeof groupsTable.$inferInsert): Promise<void> => {
    const { id: _, ...values } = entry;
    await db.insert(groupsTable).values([entry]).onConflictDoUpdate({ target: groupsTable.id, set: values });
};

const toGroupEntry = (group: AugmentedGroupRepresentation): typeof groupsTable.$inferInsert => ({
    id: group.id,
    name: group.name,
    path: group.path,
    groupType: group.attributes.groupType ?? '',
    categoryName: group.attributes.categoryName ?? '',
    displayName: group.attributes.displayName ?? group.name,
    description: group.attributes.description ?? null,
    hidden: group.attributes.hidden,
    deletedAt: null,
});

type GroupStatus = 'active' | 'archived';

const getGroupStatus = (group: AugmentedGroupRepresentation): GroupStatus => {
    const { status } = group.attributes;
    if (status === undefined || status === 'active' || status === 'archived') {
        return status ?? 'active';
    }

    // eslint-disable-next-line no-console
    console.warn(`${group.path} has the unknown status "${status}" and is treated as active.`);
    return 'active';
};

async function populateGroups(): Promise<void> {
    const groups = await keycloakGetAllGroups();

    // Otherwise all groups would be marked as deleted.
    if (groups.length === 0) {
        throw new Error('Keycloak returned no groups, aborting.');
    }

    const syncedGroupIds = new Set<string>();
    const ownStatusById = new Map(groups.map(({ group }) => [group.id, getGroupStatus(group)]));

    for (const { group, memberGroup, adminGroup, legacySubgroups } of groups) {
        const parentGroup = group.attributes.parentGroupId ?? null;
        const status: GroupStatus =
            ownStatusById.get(group.id) === 'archived' || (parentGroup !== null && ownStatusById.get(parentGroup) === 'archived')
                ? 'archived'
                : 'active';
        if (group.path.startsWith('/untergruppen/') && parentGroup === null) {
            // eslint-disable-next-line no-console
            console.warn(`${group.path} has no parent_group_id attribute and is treated as a regular group.`);
        }

        await upsertGroup({
            ...toGroupEntry(group),
            wikiLink: group.attributes.wikiLink ?? null,
            websiteLink: group.attributes.websiteLink ?? null,
            memberGroup: memberGroup?.id ?? null,
            adminGroup: adminGroup?.id ?? null,
            parentGroup,
            parentAdminsManage: parentGroup !== null && group.attributes.parentAdminsManage,
            status,
        });
        syncedGroupIds.add(group.id);

        // Old subgroups have no member and admin groups.
        for (const subgroup of legacySubgroups) {
            await upsertGroup({
                ...toGroupEntry(subgroup),
                memberGroup: null,
                adminGroup: null,
                parentGroup: group.id,
                parentAdminsManage: false,
                status: status === 'archived' ? 'archived' : getGroupStatus(subgroup),
            });
            syncedGroupIds.add(subgroup.id);
        }
    }

    // Soft delete, logs and HRP contracts still reference them.
    const deletedGroups = await db
        .select({ id: groupsTable.id, path: groupsTable.path })
        .from(groupsTable)
        .where(and(isNull(groupsTable.deletedAt), notInArray(groupsTable.id, [...syncedGroupIds])));

    if (deletedGroups.length > 0) {
        const deletedGroupIds = deletedGroups.map((group) => group.id);

        await db.transaction(async (tx) => {
            await tx.update(groupsTable).set({ deletedAt: new Date() }).where(inArray(groupsTable.id, deletedGroupIds));
            await tx.delete(membersTable).where(inArray(membersTable.groupId, deletedGroupIds));
        });

        // eslint-disable-next-line no-console
        console.log(`Marked as deleted: ${deletedGroups.map((group) => group.path).join(', ')}`);
    }

    // eslint-disable-next-line no-console
    console.log('Groups successfully populated.');
}

async function populateUsers(): Promise<void> {
    const users = await keycloakGetAllUsers();

    const entries = Array.from(users.entries());
    for (const [_, user] of entries) {
        const userEntry: typeof usersTable.$inferInsert = {
            id: user.id!,
            username: user.username!,
            displayName: !isEmpty(user.lastName) && user.lastName !== '.' ? `${user.firstName} ${user.lastName}` : user.firstName,
            email: user.email!,
            enabled: user.enabled,
        };

        await db
            .insert(usersTable)
            .values([userEntry])
            .onConflictDoUpdate({
                target: usersTable.id,
                set: {
                    username: user.username!,
                    displayName: !isEmpty(user.lastName) && user.lastName !== '.' ? `${user.firstName} ${user.lastName}` : user.firstName,
                    email: user.email!,
                    enabled: user.enabled,
                },
            });
    }

    // eslint-disable-next-line no-console
    console.log('Users successfully populated.');
}

async function populateMembers(): Promise<void> {
    const groups = await db.select().from(groupsTable).where(isNull(groupsTable.deletedAt));

    for (const group of groups) {
        const groupId = group.id;
        const memberGroupId = group.memberGroup;
        const adminGroupId = group.adminGroup;
        const isLegacySubgroup = group.parentGroup !== null && memberGroupId === null;

        let members: Array<AugmentedUserRepresentation> = [];
        let admins: Array<AugmentedUserRepresentation> = [];

        // Ohne Quelle in Keycloak lässt sich nichts abgleichen – bestehende Einträge bleiben unangetastet.
        if (!isLegacySubgroup && memberGroupId === null && adminGroupId === null) {
            continue;
        }

        if (isLegacySubgroup) {
            members = await keycloakGetDirectMembers(groupId);
        }

        if (memberGroupId !== null) {
            members = await keycloakGetDirectMembers(memberGroupId);
        }

        if (adminGroupId !== null) {
            admins = await keycloakGetDirectMembers(adminGroupId);
        }

        const uniqueEntries = new Set<string>();
        const entries: Array<typeof membersTable.$inferInsert> = [];

        admins.forEach((admin) => {
            const key = `${admin.id}-${groupId}`;
            if (!uniqueEntries.has(key)) {
                uniqueEntries.add(key);
                entries.push({
                    userId: admin.id,
                    groupId,
                    isAdmin: true,
                });
            }
        });

        members.forEach((member) => {
            const key = `${member.id}-${groupId}`;
            if (!uniqueEntries.has(key)) {
                uniqueEntries.add(key);
                entries.push({
                    userId: member.id,
                    groupId,
                    isAdmin: false,
                });
            }
        });

        const isGroupEntry = eq(membersTable.groupId, groupId);
        const userIds = entries.map((entry) => entry.userId);

        await db.transaction(async (tx) => {
            if (entries.length > 0) {
                await tx
                    .insert(membersTable)
                    .values(entries)
                    .onConflictDoUpdate({
                        target: [membersTable.userId, membersTable.groupId],
                        set: { isAdmin: sql`excluded."isAdmin"` },
                    });
            }

            // Mitgliedschaften entfernen, die es in Keycloak nicht mehr gibt.
            await tx
                .delete(membersTable)
                .where(entries.length > 0 ? and(isGroupEntry, notInArray(membersTable.userId, userIds)) : isGroupEntry);
        });
    }

    // eslint-disable-next-line no-console
    console.log('Groupmembers successfully populated.');
}

async function main(): Promise<void> {
    await populateGroups();
    await populateUsers();
    await populateMembers();

    // ToDo: Users deleted in Keycloak stay in the database. Only their memberships are removed.
}

main();
