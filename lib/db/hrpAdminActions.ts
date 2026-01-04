import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { groupsTable, hrpContractsTable, membersTable, usersTable } from '@/db/schema';

/**
 *  Hole alle Gruppen-IDs, die ein User verwalten darf
 */
async function getManagedGroupIds(userId: string): Promise<Array<string>> {
    const memberships = await db
        .select({ groupId: membersTable.groupId })
        .from(membersTable)
        .where(
            and(
                eq(membersTable.userId, userId),
                eq(membersTable.isAdmin, true), // Nur wo er Admin ist!
            ),
        );

    return memberships.map((m) => m.groupId);
}

export interface ManagedContract {
    id: string;
    userId: string;
    userName: string | null;
    groupName: string;
    type: string;
    weeklyHours: number | null;
    validFrom: Date;
    validTo: Date | null;
}

/**
 *  Hole alle Verträge die ein User verwalten darf.
 */
export async function getManagedContracts(adminUserId: string): Promise<Array<ManagedContract>> {
    const managedGroupIds = await getManagedGroupIds(adminUserId);

    if (managedGroupIds.length === 0) {
        return [];
    }

    const contracts = await db
        .select({
            id: hrpContractsTable.id,
            userId: hrpContractsTable.userId,
            userName: usersTable.displayName, // oder username
            groupName: groupsTable.displayName,
            type: hrpContractsTable.type,
            weeklyHours: hrpContractsTable.weeklyHours,
            validFrom: hrpContractsTable.validFrom,
            validTo: hrpContractsTable.validTo,
        })
        .from(hrpContractsTable)
        .innerJoin(usersTable, eq(hrpContractsTable.userId, usersTable.id))
        .innerJoin(groupsTable, eq(hrpContractsTable.employerGroupId, groupsTable.id))
        .where(inArray(hrpContractsTable.employerGroupId, managedGroupIds))
        .orderBy(groupsTable.displayName, usersTable.displayName);

    return contracts;
}
