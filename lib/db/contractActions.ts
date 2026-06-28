import { and, desc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { groupsTable, hrpContractsTable } from '@/db/schema';
import { format } from 'date-fns';

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

export async function getActiveContractsForUser(userId: string): Promise<Array<HrpContract>> {
    const now = new Date();

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
                lte(hrpContractsTable.validFrom, now),
                or(isNull(hrpContractsTable.validTo), gte(hrpContractsTable.validTo, now)),
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
    const contracts = await db
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
        .limit(1);

    return contracts.length > 0 ? contracts[0] : null;
}
