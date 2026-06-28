'use server';

import { and, asc, desc, eq, gte, inArray, isNull, lt, lte, sql } from 'drizzle-orm';
import { getAbsences } from './hrpAbsenceActions';
import { db } from '@/db';
import type {
    HrpAbsenceEntry,
    HrpContractEntry,
    HrpEventLogEntry,
    HrpHolidayConfigEntry,
    HrpMonthlyFixedEntry,
    HrpMonthlyPayrollEntry,
    HrpPayrollHourlyForecastEntry,
    HrpYearlyEntry,
} from '@/db/schema';
import {
    groupsTable,
    hrpAbsencesTable,
    hrpContractsTable,
    hrpEventLogTable,
    hrpHolidayConfigsTable,
    hrpLeaveAccountsTable,
    hrpPayrollFixedTable,
    hrpPayrollHourlyForecastsTable,
    hrpPayrollHourlyTable,
    membersTable,
    usersTable,
} from '@/db/schema';
import { getContractAtDate } from '@/lib/db/contractActions';
import { computeDayStats, type DayEntries, groupEntriesByWorkday } from '@/lib/hrp/hrpLogic';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

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
    hourlyRate: string | null;
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
            hourlyRate: hrpContractsTable.hourlyRate,
            validFrom: hrpContractsTable.validFrom,
            validTo: hrpContractsTable.validTo,
        })
        .from(hrpContractsTable)
        .innerJoin(usersTable, eq(hrpContractsTable.userId, usersTable.id))
        .innerJoin(groupsTable, eq(hrpContractsTable.employerGroupId, groupsTable.id))
        .where(inArray(hrpContractsTable.employerGroupId, managedGroupIds))
        .orderBy(desc(hrpContractsTable.validFrom), groupsTable.displayName, usersTable.displayName);

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
    hourlyRate: string | null;
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
            hourlyRate: hrpContractsTable.hourlyRate,
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
        orderBy: (table, { desc: orderDesc }) => [orderDesc(table.year)],
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
 * Berechnet Soll-Stunden für einen Monat basierend auf Arbeitstagen
 */
export async function calculateTargetHoursForMonth(
    contract: { weeklyHours: number | null; workingDays: Array<number> | null },
    year: number,
    month: number,
): Promise<number> {
    const workingDays = contract.workingDays || [1, 2, 3, 4, 5]; // Default: Mo-Fr
    const weeklyHours = contract.weeklyHours || 0;

    // Anzahl Arbeitstage pro Woche
    const daysPerWeek = workingDays.length;
    if (daysPerWeek === 0) {
        return 0;
    }

    // Stunden pro Arbeitstag
    const hoursPerDay = weeklyHours / daysPerWeek;

    // Arbeitstage im Monat zählen
    let workDaysInMonth = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay(); // 0 = So, 1 = Mo, ... 6 = Sa

        // JS getDay(): 0=So, 1=Mo, ..., 6=Sa.
        // Annahme: workingDays nutzt 1-7 für Mo-So.
        const dayMapping = dayOfWeek === 0 ? 7 : dayOfWeek;

        if (workingDays.includes(dayMapping)) {
            workDaysInMonth++;
        }
    }

    return workDaysInMonth * hoursPerDay;
}

// ==========================================
// Holiday Configs
// ==========================================
export async function getHolidayConfigs(contractId: string, year: number): Promise<Array<HrpHolidayConfigEntry>> {
    return db
        .select()
        .from(hrpHolidayConfigsTable)
        .where(and(eq(hrpHolidayConfigsTable.contractId, contractId), sql`EXTRACT(YEAR FROM ${hrpHolidayConfigsTable.date}) = ${year}`));
}

export async function upsertHolidayConfig(data: {
    id?: string;
    contractId: string;
    date: string;
    strategy: 'off' | 'work_required';
    comment?: string;
}): Promise<HrpHolidayConfigEntry> {
    const { id, ...values } = data;
    if (id) {
        const result = (await db.update(hrpHolidayConfigsTable).set(values).where(eq(hrpHolidayConfigsTable.id, id)).returning())[0];
        if (!result) {
            throw new Error('Holiday config not found');
        }
        return result;
    } else {
        const result = (
            await db
                .insert(hrpHolidayConfigsTable)
                .values({
                    id: uuidv4(),
                    ...values,
                })
                .returning()
        )[0];
        if (!result) {
            throw new Error('Holiday config could not be created');
        }
        return result;
    }
}

// ==========================================
// Hourly Forecasts
// ==========================================
export async function getForecastForContract(
    contractId: string,
    year: number,
    month: number,
): Promise<HrpPayrollHourlyForecastEntry | null> {
    return (
        (
            await db
                .select()
                .from(hrpPayrollHourlyForecastsTable)
                .where(
                    and(
                        eq(hrpPayrollHourlyForecastsTable.contractId, contractId),
                        eq(hrpPayrollHourlyForecastsTable.year, year),
                        eq(hrpPayrollHourlyForecastsTable.month, month),
                    ),
                )
                .limit(1)
        )[0] || null
    );
}

export async function upsertForecast(data: {
    contractId: string;
    year: number;
    month: number;
    forecastedHours: string;
}): Promise<HrpPayrollHourlyForecastEntry> {
    const result = (
        await db
            .insert(hrpPayrollHourlyForecastsTable)
            .values({
                id: uuidv4(),
                ...data,
            })
            .onConflictDoUpdate({
                target: [
                    hrpPayrollHourlyForecastsTable.contractId,
                    hrpPayrollHourlyForecastsTable.year,
                    hrpPayrollHourlyForecastsTable.month,
                ],
                set: { forecastedHours: data.forecastedHours },
            })
            .returning()
    )[0];

    if (!result) {
        throw new Error('Forecast could not be upserted');
    }

    return result;
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
        hourlyRate: string;
        vacationDaysPerYear: number;
        workingDays: Array<number>;
    },
    changeDate: Date,
): Promise<string> {
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
        hourlyRate: newValues.hourlyRate,
        vacationDaysPerYear: newValues.vacationDaysPerYear,
        workingDays: newValues.workingDays,
        validFrom,
        validTo: oldContract.validTo, // Behalte das ursprüngliche Enddatum bei (falls vorhanden)
    });

    return newId;
}

export async function createPayrollHourly(data: {
    contractId: string;
    year: number;
    month: number;
    recordedHours: string;
    forecastedHours: string;
    correctionFromPrevMonth: string;
    finalPayoutHours: string;
    eventLogIds: Array<string>;
    absenceIds?: Array<string>;
}): Promise<string> {
    // eslint-disable-next-line no-return-await
    return await db.transaction(async (tx) => {
        const id = uuidv4();
        const now = new Date();

        // 1. Payroll Eintrag erstellen
        await tx.insert(hrpPayrollHourlyTable).values({
            id,
            contractId: data.contractId,
            year: data.year,
            month: data.month,
            recordedHours: data.recordedHours,
            forecastedHoursLateMonth: data.forecastedHours,
            correctionFromPrevMonth: data.correctionFromPrevMonth,
            finalPayoutHours: data.finalPayoutHours,
            status: 'finalized',
            finalizedAt: now,
        });

        // 2. Event Logs als abgerechnet markieren
        if (data.eventLogIds.length > 0) {
            await tx
                .update(hrpEventLogTable)
                .set({
                    abgerechnet: true,
                    abgerechnet_date: now,
                })
                .where(inArray(hrpEventLogTable.id, data.eventLogIds));
        }

        // 3. Abwesenheiten als abgerechnet markieren
        if (data.absenceIds && data.absenceIds.length > 0) {
            await tx
                .update(hrpAbsencesTable)
                .set({
                    abgerechnet_date: now,
                })
                .where(inArray(hrpAbsencesTable.id, data.absenceIds));
        }

        return id;
    });
}

export async function getPreviousPayrollHourly(contractId: string, year: number, month: number): Promise<HrpMonthlyPayrollEntry | null> {
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth < 0) {
        prevMonth = 11;
        prevYear -= 1;
    }

    const result = await db
        .select()
        .from(hrpPayrollHourlyTable)
        .where(
            and(
                eq(hrpPayrollHourlyTable.contractId, contractId),
                eq(hrpPayrollHourlyTable.year, prevYear),
                eq(hrpPayrollHourlyTable.month, prevMonth),
            ),
        )
        .limit(1);

    return result[0] ?? null;
}

export async function getCurrentPayrollHourly(contractId: string, year: number, month: number): Promise<HrpMonthlyPayrollEntry | null> {
    const result = await db
        .select()
        .from(hrpPayrollHourlyTable)
        .where(
            and(
                eq(hrpPayrollHourlyTable.contractId, contractId),
                eq(hrpPayrollHourlyTable.year, year),
                eq(hrpPayrollHourlyTable.month, month),
            ),
        )
        .limit(1);

    return result[0] ?? null;
}

export async function getAllPayrollHourly(): Promise<Array<HrpMonthlyPayrollEntry & { userName: string | null }>> {
    const results = await db
        .select({
            payroll: hrpPayrollHourlyTable,
            userName: usersTable.displayName,
        })
        .from(hrpPayrollHourlyTable)
        .innerJoin(hrpContractsTable, eq(hrpPayrollHourlyTable.contractId, hrpContractsTable.id))
        .innerJoin(usersTable, eq(hrpContractsTable.userId, usersTable.id))
        .orderBy(desc(hrpPayrollHourlyTable.year), desc(hrpPayrollHourlyTable.month), desc(hrpPayrollHourlyTable.finalizedAt));

    return results.map((r) => ({
        ...r.payroll,
        userName: r.userName,
    }));
}

export async function getUnbilledAbsences(contractId: string, upToDate: Date): Promise<Array<HrpAbsenceEntry>> {
    // eslint-disable-next-line no-return-await
    return await db
        .select()
        .from(hrpAbsencesTable)
        .where(
            and(
                eq(hrpAbsencesTable.contractId, contractId),
                isNull(hrpAbsencesTable.abgerechnet_date),
                isNull(hrpAbsencesTable.deletedAt),
                lte(hrpAbsencesTable.date, format(upToDate, 'yyyy-MM-dd')),
            ),
        )
        .orderBy(desc(hrpAbsencesTable.date));
}

export async function getUnbilledAbsencesForUser(userId: string, upToDate: Date): Promise<Array<HrpAbsenceEntry>> {
    const results = await db
        .select({
            absence: hrpAbsencesTable,
        })
        .from(hrpAbsencesTable)
        .innerJoin(hrpContractsTable, eq(hrpAbsencesTable.contractId, hrpContractsTable.id))
        .where(
            and(
                eq(hrpContractsTable.userId, userId),
                isNull(hrpAbsencesTable.abgerechnet_date),
                isNull(hrpAbsencesTable.deletedAt),
                lte(hrpAbsencesTable.date, format(upToDate, 'yyyy-MM-dd')),
            ),
        )
        .orderBy(desc(hrpAbsencesTable.date));

    return results.map((r) => r.absence);
}

export async function getUnbilledLogs(userId: string, contractId: string, upToDate: Date): Promise<Array<HrpEventLogEntry>> {
    // eslint-disable-next-line no-return-await
    return await db
        .select()
        .from(hrpEventLogTable)
        .where(
            and(
                eq(hrpEventLogTable.userId, userId),
                eq(hrpEventLogTable.contractId, contractId),
                eq(hrpEventLogTable.abgerechnet, false),
                isNull(hrpEventLogTable.abgerechnet_date),
                isNull(hrpEventLogTable.deletedAt),
                lt(hrpEventLogTable.loggedTimestamp, upToDate),
            ),
        )
        .orderBy(desc(hrpEventLogTable.loggedTimestamp));
}

/**
 * Vertrag löschen (markieren)
 */
export async function terminateContract(contractId: string, terminationDate: Date): Promise<Array<HrpContractEntry>> {
    return db.update(hrpContractsTable).set({ validTo: terminationDate }).where(eq(hrpContractsTable.id, contractId)).returning();
}

export async function getPayrollFixedEntries(contractId: string, year: number): Promise<Array<HrpMonthlyFixedEntry>> {
    return db.query.hrpPayrollFixedTable.findMany({
        where: and(eq(hrpPayrollFixedTable.contractId, contractId), eq(hrpPayrollFixedTable.year, year)),
        orderBy: (table, { asc: ascCallback }) => [ascCallback(table.month)],
    });
}

export async function getPayrollFixedEntriesForUser(userId: string, year: number): Promise<Array<HrpMonthlyFixedEntry>> {
    return db
        .select({
            payroll: hrpPayrollFixedTable,
        })
        .from(hrpPayrollFixedTable)
        .innerJoin(hrpContractsTable, eq(hrpPayrollFixedTable.contractId, hrpContractsTable.id))
        .where(and(eq(hrpContractsTable.userId, userId), eq(hrpPayrollFixedTable.year, year)))
        .orderBy(asc(hrpPayrollFixedTable.month))
        .then((res) => res.map((r) => r.payroll));
}

export async function upsertPayrollFixedEntry(data: {
    id?: string;
    contractId: string;
    year: number;
    month: number;
    targetHours: string;
    actualWorkHours: string;
    approvedOvertime: string;
    creditedHours: string;
    status?: string;
}): Promise<Array<HrpMonthlyFixedEntry>> {
    const { id, ...values } = data;
    if (id) {
        return db
            .update(hrpPayrollFixedTable)
            .set({ ...values, finalizedAt: values.status === 'finalized' ? new Date() : null })
            .where(eq(hrpPayrollFixedTable.id, id))
            .returning();
    } else {
        return db
            .insert(hrpPayrollFixedTable)
            .values({
                id: uuidv4(),
                ...values,
                finalizedAt: values.status === 'finalized' ? new Date() : null,
            })
            .returning();
    }
}

export async function recalculatePayrollFixed(contractId: string, year: number, month: number): Promise<void> {
    const contract = await db.query.hrpContractsTable.findFirst({
        where: eq(hrpContractsTable.id, contractId),
    });

    if (!contract) {
        throw new Error('Vertrag nicht gefunden');
    }

    const dailyLogs = await db.query.hrpEventLogTable.findMany({
        where: and(
            eq(hrpEventLogTable.userId, contract.userId),
            gte(hrpEventLogTable.loggedTimestamp, new Date(year, month, 1, 0, 0, 0)),
            lt(hrpEventLogTable.loggedTimestamp, new Date(year, month + 1, 1, 0, 0, 0)),
            isNull(hrpEventLogTable.deletedAt),
        ),
    });

    const groupedLogs = groupEntriesByWorkday(dailyLogs);

    let actualWorkHoursMinutes = 0;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const dateStr = format(date, 'yyyy-MM-dd');

        const dayLogs = groupedLogs[dateStr] || [];
        const absences = await getAbsences(contractId, dateStr, dateStr);

        const dayEntries: DayEntries = [
            ...dayLogs,
            ...absences.map((a) => ({
                id: a.id,
                entryType: 'absence',
                loggedTimestamp: a.date,
                absence: a,
            })),
        ] as DayEntries;

        const stats = computeDayStats(
            dayEntries,
            { weeklyHours: contract.weeklyHours, workingDays: contract.workingDays, type: contract.type },
            date,
        );
        actualWorkHoursMinutes += stats.netMinutes;
    }

    const actualWorkHours = actualWorkHoursMinutes / 60;
    const targetHours = await calculateTargetHoursForMonth(contract, year, month);

    // Feiertags-Anpassung
    // Hier prüfen wir noch, ob wir die Feiertage korrekt berücksichtigen,
    // aber die actualWorkHours-Berechnung ist jetzt konsistent mit der UI.

    const creditedHours = actualWorkHours - targetHours;

    // Bestehenden Eintrag suchen
    const existing = await db.query.hrpPayrollFixedTable.findFirst({
        where: and(
            eq(hrpPayrollFixedTable.contractId, contractId),
            eq(hrpPayrollFixedTable.year, year),
            eq(hrpPayrollFixedTable.month, month),
        ),
    });

    await upsertPayrollFixedEntry({
        id: existing?.id,
        contractId,
        year,
        month,
        targetHours: targetHours.toFixed(6),
        actualWorkHours: actualWorkHours.toFixed(6),
        approvedOvertime: '0.000000', // Manuelle Freigabe fehlt noch
        creditedHours: creditedHours.toFixed(6),
        status: 'open',
    });
}

export async function recalculatePayrollFixedForUserAtDate(userId: string, year: number, month: number): Promise<void> {
    const targetDate = new Date(year, month, 1);
    const contractForMonth = await getContractAtDate(userId, targetDate);
    if (!contractForMonth) {
        throw new Error('Kein gültiger Vertrag für diesen Monat gefunden');
    }
    await recalculatePayrollFixed(contractForMonth.contractId, year, month);
}
