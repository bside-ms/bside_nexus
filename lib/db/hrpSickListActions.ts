import { and, asc, eq, gte, inArray, isNull, lte, ne, or } from 'drizzle-orm';
import { db } from '@/db';
import { groupsTable, hrpAbsencesTable, hrpContractsTable, hrpPublicHolidaysTable, usersTable } from '@/db/schema';
import { isGlobalAdmin } from '@/lib/db/groupActions';
import { getManagedGroupIds } from '@/lib/db/hrpAdminActions';

export interface SickListGroup {
    id: string;
    name: string;
}

export interface SickAbsenceRow {
    userId: string;
    userName: string | null;
    employerGroupId: string;
    workingDays: Array<number> | null;
    date: string;
    type: string;
    hoursValue: string;
}

/**
 * Employer groups whose sick list the user may see. Same rule as getManagedContracts..
 */
export async function getSickListGroups(adminUserId: string): Promise<Array<SickListGroup>> {
    const groups = await db
        .selectDistinct({ id: groupsTable.id, name: groupsTable.displayName })
        .from(hrpContractsTable)
        .innerJoin(groupsTable, eq(hrpContractsTable.employerGroupId, groupsTable.id));

    const managedGroupIds = isGlobalAdmin(adminUserId) ? null : new Set(await getManagedGroupIds(adminUserId));

    return groups
        .filter((group) => managedGroupIds === null || managedGroupIds.has(group.id))
        .map((group) => ({ id: group.id, name: group.name.replace(/ - Mitarbeitende$/, '') }))
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

export async function getSickAbsences(employerGroupIds: Array<string>, from: string, to: string): Promise<Array<SickAbsenceRow>> {
    if (employerGroupIds.length === 0) {
        return [];
    }

    return db
        .select({
            userId: hrpContractsTable.userId,
            userName: usersTable.displayName,
            employerGroupId: hrpContractsTable.employerGroupId,
            workingDays: hrpContractsTable.workingDays,
            date: hrpAbsencesTable.date,
            type: hrpAbsencesTable.type,
            hoursValue: hrpAbsencesTable.hoursValue,
        })
        .from(hrpAbsencesTable)
        .innerJoin(hrpContractsTable, eq(hrpAbsencesTable.contractId, hrpContractsTable.id))
        .innerJoin(usersTable, eq(hrpContractsTable.userId, usersTable.id))
        .where(
            and(
                inArray(hrpContractsTable.employerGroupId, employerGroupIds),
                inArray(hrpAbsencesTable.type, ['sick', 'sick_with']),
                isNull(hrpAbsencesTable.deletedAt),
                or(isNull(hrpAbsencesTable.status), ne(hrpAbsencesTable.status, 'declined')),
                gte(hrpAbsencesTable.date, from),
                lte(hrpAbsencesTable.date, to),
            ),
        )
        .orderBy(asc(hrpAbsencesTable.date));
}

export async function getPublicHolidayDates(from: string, to: string): Promise<Set<string>> {
    const holidays = await db
        .select({ date: hrpPublicHolidaysTable.date })
        .from(hrpPublicHolidaysTable)
        .where(and(gte(hrpPublicHolidaysTable.date, from), lte(hrpPublicHolidaysTable.date, to)));

    return new Set(holidays.map((holiday) => holiday.date));
}
