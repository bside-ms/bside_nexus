import { and, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { groupsTable, hrpContractsTable } from '@/db/schema';

export interface HrpContract {
    contractId: string;
    type: string; // 'fixed_salary' | 'hourly'
    groupName: string;
    weeklyHours: number | null;
}

export async function getActiveContractsForUser(userId: string): Promise<Array<HrpContract>> {
    const now = new Date();

    return db
        .select({
            contractId: hrpContractsTable.id,
            type: hrpContractsTable.type,
            groupName: sql<string>`REPLACE(${groupsTable.displayName}, ' - Mitarbeitende', '')`,
            weeklyHours: hrpContractsTable.weeklyHours,
        })
        .from(hrpContractsTable)
        .innerJoin(groupsTable, eq(hrpContractsTable.employerGroupId, groupsTable.id))
        .where(
            and(
                eq(hrpContractsTable.userId, userId),
                lte(hrpContractsTable.validFrom, now),
                or(isNull(hrpContractsTable.validTo), gte(hrpContractsTable.validTo, now)),
            ),
        );
}
