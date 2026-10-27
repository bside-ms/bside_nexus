import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { groupsTable, hrpContractsTable } from '@/db/schema';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export interface NewContractValues {
    userId: string;
    employerGroupId: string;
    type: string; // 'fixed_salary' | 'hourly'
    weeklyHours: number;
    hourlyRate: string;
    vacationDaysPerYear: number;
    workingDays: Array<number>;
    validFrom: string; // YYYY-MM-DD
}

export async function createContract(values: NewContractValues): Promise<string> {
    const id = uuidv4();

    await db.insert(hrpContractsTable).values({
        id,
        ...values,
        validFrom: new Date(values.validFrom),
        validTo: null,
    });

    return id;
}

export interface HrpContract {
    contractId: string;
    userId: string;
    type: string; // 'fixed_salary' | 'hourly'
    groupName: string;
    weeklyHours: number | null;
    workingDays: Array<number> | null;
    vacationDaysPerYear: number | null;
    hourlyRate: string | null;
    validFrom: Date;
    validTo: Date | null;
}

/**
 * Alle Fassungen eines Vertrags: Verträge derselben Person beim selben Arbeitgeber.
 * Nach einer Vertragsänderung liegen ältere Buchungen und Abrechnungen an der vorherigen Fassung.
 */
export async function getContractChainIds(contractId: string): Promise<Array<string>> {
    const contract = await db.query.hrpContractsTable.findFirst({
        where: eq(hrpContractsTable.id, contractId),
    });
    if (!contract) {
        return [contractId];
    }

    const chain = await db
        .select({ id: hrpContractsTable.id })
        .from(hrpContractsTable)
        .where(and(eq(hrpContractsTable.userId, contract.userId), eq(hrpContractsTable.employerGroupId, contract.employerGroupId)));

    return chain.map((c) => c.id);
}

export async function getActiveContractsForUser(userId: string): Promise<Array<HrpContract>> {
    // Vergleich nach Kalendertag: Ein Vertrag gilt auch an seinem letzten Tag noch ganz (validTo ist 00:00 UTC dieses Tages).
    // Der Folgevertrag gilt ab 00:00 Uhr seines ersten Tages.
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date());

    return db
        .select({
            contractId: hrpContractsTable.id,
            userId: hrpContractsTable.userId,
            type: hrpContractsTable.type,
            groupName: sql<string>`REPLACE(${groupsTable.displayName}, ' - Mitarbeitende', '')`,
            weeklyHours: hrpContractsTable.weeklyHours,
            workingDays: hrpContractsTable.workingDays,
            vacationDaysPerYear: hrpContractsTable.vacationDaysPerYear,
            hourlyRate: hrpContractsTable.hourlyRate,
            validFrom: hrpContractsTable.validFrom,
            validTo: hrpContractsTable.validTo,
        })
        .from(hrpContractsTable)
        .innerJoin(groupsTable, eq(hrpContractsTable.employerGroupId, groupsTable.id))
        .where(
            and(
                eq(hrpContractsTable.userId, userId),
                sql`${hrpContractsTable.validFrom}::date <= ${today}::date`,
                or(isNull(hrpContractsTable.validTo), sql`${hrpContractsTable.validTo}::date >= ${today}::date`),
            ),
        )
        .orderBy(desc(hrpContractsTable.validFrom));
}

export async function getContractsForUser(userId: string): Promise<Array<HrpContract>> {
    return db
        .select({
            contractId: hrpContractsTable.id,
            userId: hrpContractsTable.userId,
            type: hrpContractsTable.type,
            groupName: sql<string>`REPLACE(${groupsTable.displayName}, ' - Mitarbeitende', '')`,
            weeklyHours: hrpContractsTable.weeklyHours,
            workingDays: hrpContractsTable.workingDays,
            vacationDaysPerYear: hrpContractsTable.vacationDaysPerYear,
            hourlyRate: hrpContractsTable.hourlyRate,
            validFrom: hrpContractsTable.validFrom,
            validTo: hrpContractsTable.validTo,
        })
        .from(hrpContractsTable)
        .innerJoin(groupsTable, eq(hrpContractsTable.employerGroupId, groupsTable.id))
        .where(eq(hrpContractsTable.userId, userId))
        .orderBy(desc(hrpContractsTable.validFrom));
}

export async function getContractAtDate(userId: string, date: Date): Promise<HrpContract | null> {
    const dateString = format(date, 'yyyy-MM-dd');
    const contracts: Array<HrpContract> = await db
        .select({
            contractId: hrpContractsTable.id,
            userId: hrpContractsTable.userId,
            type: hrpContractsTable.type,
            groupName: sql<string>`REPLACE(${groupsTable.displayName}, ' - Mitarbeitende', '')`,
            weeklyHours: hrpContractsTable.weeklyHours,
            workingDays: hrpContractsTable.workingDays,
            vacationDaysPerYear: hrpContractsTable.vacationDaysPerYear,
            hourlyRate: hrpContractsTable.hourlyRate,
            validFrom: hrpContractsTable.validFrom,
            validTo: hrpContractsTable.validTo,
        })
        .from(hrpContractsTable)
        .innerJoin(groupsTable, eq(hrpContractsTable.employerGroupId, groupsTable.id))
        .where(
            and(
                eq(hrpContractsTable.userId, userId),
                sql`${hrpContractsTable.validFrom}::date <= ${dateString}::date`,
                or(isNull(hrpContractsTable.validTo), sql`${hrpContractsTable.validTo}::date >= ${dateString}::date`),
            ),
        )
        // Bei parallel laufenden Verträgen gewinnt die Festanstellung.
        .orderBy(sql`(${hrpContractsTable.type} = 'fixed_salary') DESC`, desc(hrpContractsTable.validFrom))
        .limit(1);

    return contracts.length > 0 ? contracts[0]! : null;
}
