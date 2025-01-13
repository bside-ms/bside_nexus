import { drizzle } from 'drizzle-orm/node-postgres';
import 'dotenv/config';
import { groupsTable, membersTable } from '@/db/schema';
import { adminGroupIdentifier, getAllGroups, getDirectMembers, membersGroupIdentifier } from '@/lib/keycloak/groupActions';
import type { AugmentedUserRepresentation } from '@/lib/keycloak/userActions';

const db = drizzle({
    connection: {
        connectionString: process.env.DATABASE_URL!,
        ssl: true,
    },
});

async function populateGroups(): Promise<void> {
    const groups = await getAllGroups();

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
            memberGroup,
            adminGroup,
        };

        await db.insert(groupsTable).values([groupEntry]).onConflictDoNothing({ target: groupsTable.id });
    }

    // eslint-disable-next-line no-console
    console.log('Groups successfully populated.');
}

async function populateMembers(): Promise<void> {
    const groups = await db.select().from(groupsTable);

    for (const group of groups) {
        const groupId = group.id;
        const memberGroupId = group.memberGroup;
        const adminGroupId = group.adminGroup;

        let members: Array<AugmentedUserRepresentation> = [];
        let admins: Array<AugmentedUserRepresentation> = [];

        if (memberGroupId !== null) {
            members = await getDirectMembers(memberGroupId);
        }

        if (adminGroupId !== null) {
            admins = await getDirectMembers(adminGroupId);
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

        await db
            .insert(membersTable)
            .values(entries)
            .onConflictDoNothing({
                target: [membersTable.userId, membersTable.groupId],
            });
    }

    // eslint-disable-next-line no-console
    console.log('Groupmembers successfully populated.');
}

async function main(): Promise<void> {
    await populateGroups();
    await populateMembers();
}

main();
