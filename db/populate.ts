import { isNull } from 'drizzle-orm';
import { isEmpty } from 'lodash-es';
import 'dotenv/config';
import { db } from '@/db/index';
import { groupsTable, membersTable, usersTable } from '@/db/schema';
import { adminGroupIdentifier, keycloakGetAllGroups, keycloakGetDirectMembers, membersGroupIdentifier } from '@/lib/keycloak/groupActions';
import { type AugmentedUserRepresentation, keycloakGetAllUsers } from '@/lib/keycloak/userActions';

async function populateGroups(): Promise<void> {
    const groups = await keycloakGetAllGroups();

    const entries = Array.from(groups.entries());
    for (const [parentGroup, subGroups] of entries) {
        let memberGroup: string | undefined = undefined;
        let adminGroup: string | undefined = undefined;

        for (const subgroup of subGroups) {
            if (subgroup.path.endsWith(membersGroupIdentifier)) {
                memberGroup = subgroup.id;
                continue;
            }

            if (subgroup.path.endsWith(adminGroupIdentifier)) {
                adminGroup = subgroup.id;
                continue;
            }

            if (subgroup.path.includes('eingeschränkt') || subgroup.path.includes('erweitert')) {
                const subGroupEntry: typeof groupsTable.$inferInsert = {
                    id: subgroup.id,
                    name: subgroup.name,
                    path: subgroup.path,
                    groupType: subgroup.attributes.groupType ?? '',
                    categoryName: subgroup.attributes.categoryName ?? '',
                    displayName: subgroup.attributes.displayName ?? subgroup.name,
                    description: subgroup.attributes.description,
                    parentGroup: parentGroup.id,
                };

                await db
                    .insert(groupsTable)
                    .values([subGroupEntry])
                    .onConflictDoUpdate({
                        target: groupsTable.id,
                        set: {
                            name: subgroup.name,
                            path: subgroup.path,
                            groupType: subgroup.attributes.groupType ?? '',
                            categoryName: subgroup.attributes.categoryName ?? '',
                            displayName: subgroup.attributes.displayName ?? subgroup.name,
                            description: subgroup.attributes.description,
                            parentGroup: parentGroup.id,
                        },
                    });
            }
        }

        const groupEntry: typeof groupsTable.$inferInsert = {
            id: parentGroup.id,
            name: parentGroup.name,
            path: parentGroup.path,
            groupType: parentGroup.attributes.groupType ?? '',
            categoryName: parentGroup.attributes.categoryName ?? '',
            displayName: parentGroup.attributes.displayName ?? parentGroup.name,
            description: parentGroup.attributes.description,
            wikiLink: parentGroup.attributes.wikiLink,
            websiteLink: parentGroup.attributes.websiteLink,
            memberGroup,
            adminGroup,
        };

        await db
            .insert(groupsTable)
            .values([groupEntry])
            .onConflictDoUpdate({
                target: groupsTable.id,
                set: {
                    name: parentGroup.name,
                    path: parentGroup.path,
                    groupType: parentGroup.attributes.groupType ?? '',
                    categoryName: parentGroup.attributes.categoryName ?? '',
                    displayName: parentGroup.attributes.displayName ?? parentGroup.name,
                    description: parentGroup.attributes.description,
                    wikiLink: parentGroup.attributes.wikiLink,
                    websiteLink: parentGroup.attributes.websiteLink,
                    memberGroup,
                    adminGroup,
                },
            });
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
            displayName: !isEmpty(user.firstName) ? user.firstName : null,
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
                    displayName: !isEmpty(user.firstName) ? user.firstName : null,
                    email: user.email!,
                    enabled: user.enabled,
                },
            });
    }

    // eslint-disable-next-line no-console
    console.log('Users successfully populated.');
}

async function populateMembers(): Promise<void> {
    const groups = await db.select().from(groupsTable).where(isNull(groupsTable.parentGroup));

    for (const group of groups) {
        const groupId = group.id;
        const memberGroupId = group.memberGroup;
        const adminGroupId = group.adminGroup;

        let members: Array<AugmentedUserRepresentation> = [];
        let admins: Array<AugmentedUserRepresentation> = [];

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

        if (entries.length > 0) {
            await db
                .insert(membersTable)
                .values(entries)
                .onConflictDoNothing({
                    target: [membersTable.userId, membersTable.groupId],
                });
        }
    }

    // eslint-disable-next-line no-console
    console.log('Groupmembers successfully populated.');
}

async function cleanTables(): Promise<void> {
    await db.delete(membersTable);

    // eslint-disable-next-line no-console
    console.log('Tables successfully cleaned.');
}

async function main(): Promise<void> {
    await cleanTables();
    await populateGroups();
    await populateUsers();
    await populateMembers();

    // ToDo: Deleted users and groups are currently not deleted from the database.
    // I am not sure what problems this might cause. Manually deleting the users and groups from the database is a good idea.
}

main();
