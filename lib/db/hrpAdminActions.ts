import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import type { HrpContractEntry, HrpYearlyEntry } from '@/db/schema';
import { groupsTable, hrpContractsTable, hrpLeaveAccountsTable, membersTable, usersTable } from '@/db/schema';

/**
 *  Hole alle Gruppen-IDs, die ein User verwalten darf
 */
async function getManagedGroupIds(userId: string): Promise<Array<string>> {
    const memberships = await db
        .select({ groupId: membersTable.groupId })
        .from(membersTable)
        .where(and(eq(membersTable.userId, userId), eq(membersTable.isAdmin, true)));

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

export interface ContractDetails {
    id: string;
    userId: string;
    userName: string | null;
    userEmail: string;
    groupName: string;
    employerGroupId: string;
    type: string;
    weeklyHours: number | null;
    vacationDaysPerYear: number | null;
    workingDays: Array<number> | null;
    validFrom: Date;
    validTo: Date | null;
}

export async function getContractById(contractId: string): Promise<ContractDetails | null> {
    const result = await db
        .select({
            id: hrpContractsTable.id,
            userId: hrpContractsTable.userId,
            userName: usersTable.displayName,
            userEmail: usersTable.email,
            groupName: groupsTable.displayName,
            employerGroupId: hrpContractsTable.employerGroupId,
            type: hrpContractsTable.type,
            weeklyHours: hrpContractsTable.weeklyHours,
            vacationDaysPerYear: hrpContractsTable.vacationDaysPerYear,
            workingDays: hrpContractsTable.workingDays,
            validFrom: hrpContractsTable.validFrom,
            validTo: hrpContractsTable.validTo,
        })
        .from(hrpContractsTable)
        .innerJoin(usersTable, eq(hrpContractsTable.userId, usersTable.id))
        .innerJoin(groupsTable, eq(hrpContractsTable.employerGroupId, groupsTable.id))
        .where(eq(hrpContractsTable.id, contractId))
        .limit(1);

    return result[0] ?? null;
}

export async function getLeaveAccounts(contractId: string): Promise<Array<HrpYearlyEntry>> {
    // eslint-disable-next-line no-return-await
    return await db.query.hrpLeaveAccountsTable.findMany({
        where: eq(hrpLeaveAccountsTable.contractId, contractId),
        orderBy: (table, { desc }) => [desc(table.year)],
    });
}

export async function upsertLeaveAccount(data: {
    id?: string;
    contractId: string;
    year: number;
    totalVacationDays: number;
    remainingDaysFromLastYear: number;
    overtimeCarryoverHours: string;
}): Promise<Array<HrpYearlyEntry>> {
    const { id, ...values } = data;

    if (id) {
        // eslint-disable-next-line no-return-await
        return await db.update(hrpLeaveAccountsTable).set(values).where(eq(hrpLeaveAccountsTable.id, id)).returning();
    } else {
        const { v4: uuidv4 } = await import('uuid');
        // eslint-disable-next-line no-return-await
        return await db
            .insert(hrpLeaveAccountsTable)
            .values({
                id: uuidv4(),
                ...values,
            })
            .returning();
    }
}

export async function deleteLeaveAccount(id: string): Promise<Array<HrpYearlyEntry>> {
    // eslint-disable-next-line no-return-await
    return await db.delete(hrpLeaveAccountsTable).where(eq(hrpLeaveAccountsTable.id, id)).returning();
}

/**
 * Vertrag aktualisieren:
 * 1. Aktuellen Vertrag zum Stichtag beenden (validTo setzen)
 * 2. Neuen Vertrag ab dem Folgetag anlegen
 */
export async function updateContract(
    oldContractId: string,
    newValues: {
        type: string;
        weeklyHours: number;
        vacationDaysPerYear: number;
        workingDays: Array<number>;
    },
    changeDate: Date,
): Promise<string> {
    const { v4: uuidv4 } = await import('uuid');

    // 1. Alten Vertrag holen
    const oldContract = await db.query.hrpContractsTable.findFirst({
        where: eq(hrpContractsTable.id, oldContractId),
    });

    if (!oldContract) {
        throw new Error('Vertrag nicht gefunden');
    }

    // 2. Alten Vertrag beenden
    await db.update(hrpContractsTable).set({ validTo: changeDate }).where(eq(hrpContractsTable.id, oldContractId));

    // 3. Neuen Vertrag anlegen (Stichtag + 1 Tag)
    const validFrom = new Date(changeDate);
    validFrom.setDate(validFrom.getDate() + 1);

    const newId = uuidv4();
    await db.insert(hrpContractsTable).values({
        id: newId,
        userId: oldContract.userId,
        employerGroupId: oldContract.employerGroupId,
        type: newValues.type,
        weeklyHours: newValues.weeklyHours,
        vacationDaysPerYear: newValues.vacationDaysPerYear,
        workingDays: newValues.workingDays,
        validFrom,
        validTo: oldContract.validTo, // Behalte das ursprüngliche Enddatum bei (falls vorhanden)
    });

    return newId;
}

/**
 * Vertrag löschen (markieren)
 */
export async function terminateContract(contractId: string, terminationDate: Date): Promise<Array<HrpContractEntry>> {
    // eslint-disable-next-line no-return-await
    return await db.update(hrpContractsTable).set({ validTo: terminationDate }).where(eq(hrpContractsTable.id, contractId)).returning();
}
