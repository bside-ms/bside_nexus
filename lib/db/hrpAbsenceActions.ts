import { and, desc, eq, gte, isNull, lt, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import type { HrpAbsenceEntry } from '@/db/schema';
import { hrpAbsencesTable, hrpContractsTable, hrpDailyRecordTable, hrpHolidayConfigsTable } from '@/db/schema';
import { aggregateDay } from '@/lib/hrp/aggregation';
import { differenceInDays, format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export async function createAbsence(
    userId: string,
    data: {
        contractId: string;
        type: 'vacation' | 'sick' | 'sick_with' | 'compensatory_day';
        startDate: string;
        endDate: string;
    },
): Promise<{ success: boolean; count: number }> {
    const { contractId, type, startDate, endDate } = data;

    const contract = await db.query.hrpContractsTable.findFirst({
        where: and(eq(hrpContractsTable.id, contractId), eq(hrpContractsTable.userId, userId)),
    });

    if (!contract) {
        throw new Error('Contract not found');
    }

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const daysCount = differenceInDays(end, start) + 1;

    if (daysCount <= 0) {
        throw new Error('Invalid date range');
    }

    if (type === 'compensatory_day') {
        // Prüfe auf work_required Feiertag in den letzten 7 Tagen
        const sevenDaysAgo = new Date(start);
        sevenDaysAgo.setDate(start.getDate() - 7);
        const sevenDaysAgoStr = format(sevenDaysAgo, 'yyyy-MM-dd');

        const validHoliday = await db.query.hrpHolidayConfigsTable.findFirst({
            where: and(
                eq(hrpHolidayConfigsTable.contractId, contractId),
                eq(hrpHolidayConfigsTable.strategy, 'work_required'),
                gte(hrpHolidayConfigsTable.date, sevenDaysAgoStr),
                lt(hrpHolidayConfigsTable.date, startDate),
                eq(hrpHolidayConfigsTable.status, 'none'),
            ),
        });

        if (!validHoliday) {
            throw new Error('Kein anrechenbarer Feiertag in den letzten 7 Tagen gefunden.');
        }
    }

    // Hole Feiertage (contractId IS NULL) im Zeitraum
    const globalHolidays = await db.query.hrpAbsencesTable.findMany({
        where: and(
            isNull(hrpAbsencesTable.contractId),
            eq(hrpAbsencesTable.type, 'holiday'),
            gte(hrpAbsencesTable.date, startDate),
            lte(hrpAbsencesTable.date, endDate),
            isNull(hrpAbsencesTable.deletedAt),
        ),
    });

    const holidayDates = new Set(globalHolidays.map((h) => h.date));

    const absences: Array<typeof hrpAbsencesTable.$inferInsert> = [];
    const dailyRecords: Array<typeof hrpDailyRecordTable.$inferInsert> = [];

    for (let i = 0; i < daysCount; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const dayOfWeek = currentDate.getDay(); // 0 = So, 1 = Mo, ..., 6 = Sa
        const mappedDay = dayOfWeek === 0 ? 7 : dayOfWeek;

        // Überspringe, wenn es ein Feiertag ist oder kein Arbeitstag
        if (holidayDates.has(dateStr) || (!contract.workingDays?.includes(mappedDay) && type !== 'compensatory_day')) {
            continue;
        }

        const workingDaysCount = contract.workingDays?.length || 5;
        const hoursPerDay = contract.weeklyHours ? (contract.weeklyHours / workingDaysCount).toFixed(6) : '0.00';

        absences.push({
            id: uuidv4(),
            contractId,
            type,
            date: dateStr,
            hoursValue: hoursPerDay,
            status: 'approved',
        });

        dailyRecords.push({
            id: uuidv4(),
            userId,
            contractId,
            date: dateStr,
            dayType: type,
            totalWorkHours: hoursPerDay,
            totalBreakHours: '0.00',
            updatedAt: new Date(),
        });
    }

    // eslint-disable-next-line no-return-await
    return await db.transaction(async (tx) => {
        // Bestehende vacation/sick Einträge im Zeitraum löschen
        await tx
            .update(hrpAbsencesTable)
            .set({
                deletedAt: new Date(),
                deletedBy: userId,
                deletionReason: 'Überschrieben durch neue Abwesenheit',
            })
            .where(
                and(
                    eq(hrpAbsencesTable.contractId, contractId),
                    gte(hrpAbsencesTable.date, startDate),
                    lte(hrpAbsencesTable.date, endDate),
                    sql`${hrpAbsencesTable.type} IN ('vacation', 'sick', 'sick_with')`,
                    isNull(hrpAbsencesTable.deletedAt),
                    isNull(hrpAbsencesTable.abgerechnet_date),
                ),
            );

        if (absences.length > 0) {
            await tx.insert(hrpAbsencesTable).values(absences);

            if (type === 'compensatory_day') {
                // Update den Status des gefundenen Feiertags auf 'taken'
                const sevenDaysAgo = new Date(start);
                sevenDaysAgo.setDate(start.getDate() - 7);
                const sevenDaysAgoStr = format(sevenDaysAgo, 'yyyy-MM-dd');

                const validHoliday = await tx.query.hrpHolidayConfigsTable.findFirst({
                    where: and(
                        eq(hrpHolidayConfigsTable.contractId, contractId),
                        eq(hrpHolidayConfigsTable.strategy, 'work_required'),
                        gte(hrpHolidayConfigsTable.date, sevenDaysAgoStr),
                        lt(hrpHolidayConfigsTable.date, startDate),
                        eq(hrpHolidayConfigsTable.status, 'none'),
                    ),
                });

                if (validHoliday) {
                    await tx
                        .update(hrpHolidayConfigsTable)
                        .set({
                            status: 'taken',
                            compensatoryAbsenceId: absences[0]!.id,
                        })
                        .where(eq(hrpHolidayConfigsTable.id, validHoliday.id));
                }
            }

            for (const record of dailyRecords) {
                await tx
                    .insert(hrpDailyRecordTable)
                    .values(record)
                    .onConflictDoUpdate({
                        target: [hrpDailyRecordTable.userId, hrpDailyRecordTable.date, hrpDailyRecordTable.contractId],
                        set: {
                            dayType: record.dayType,
                            totalWorkHours: record.totalWorkHours,
                            totalBreakHours: record.totalBreakHours,
                            updatedAt: record.updatedAt,
                        },
                    });
            }
        }

        return { success: true, count: absences.length };
    });
}

export async function getAbsences(contractId: string, startDate: string, endDate: string): Promise<Array<HrpAbsenceEntry>> {
    return db.query.hrpAbsencesTable.findMany({
        where: and(
            eq(hrpAbsencesTable.contractId, contractId),
            gte(hrpAbsencesTable.date, startDate),
            lte(hrpAbsencesTable.date, endDate),
            isNull(hrpAbsencesTable.deletedAt),
        ),
    });
}

export async function getUpcomingVacations(userId: string, year?: number): Promise<Array<HrpAbsenceEntry>> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const startOfYear = year ? `${year}-01-01` : format(new Date(), 'yyyy-01-01');
    const endOfYear = year ? `${year}-12-31` : format(new Date(), 'yyyy-12-31');

    const contracts = await db.query.hrpContractsTable.findMany({
        where: eq(hrpContractsTable.userId, userId),
    });

    const contractIds = contracts.map((c) => c.id);

    if (contractIds.length === 0) {
        return [];
    }

    const lowerBound = today > startOfYear ? today : startOfYear;

    return db.query.hrpAbsencesTable.findMany({
        where: and(
            sql`${hrpAbsencesTable.contractId} IN ${contractIds}`,
            eq(hrpAbsencesTable.type, 'vacation'),
            gte(hrpAbsencesTable.date, lowerBound),
            lte(hrpAbsencesTable.date, endOfYear),
            isNull(hrpAbsencesTable.deletedAt),
        ),
        orderBy: [desc(hrpAbsencesTable.date)],
    });
}

export async function deleteAbsence(userId: string, absenceId: string, reason: string): Promise<{ success: boolean }> {
    const absence = await db.query.hrpAbsencesTable.findFirst({
        where: eq(hrpAbsencesTable.id, absenceId),
    });
    if (!absence) {
        throw new Error('Die Abwesenheit wurde nicht gefunden.');
    }

    if (absence.abgerechnet_date) {
        throw new Error('Abgerechnete Abwesenheiten können nicht gelöscht werden.');
    }

    const contract = await db.query.hrpContractsTable.findFirst({
        where: and(eq(hrpContractsTable.id, absence.contractId), eq(hrpContractsTable.userId, userId)),
    });
    if (!contract) {
        throw new Error('Dir fehlen die erforderlichen Berechtigungen.');
    }

    // eslint-disable-next-line no-return-await
    return await db.transaction(async (tx) => {
        await tx
            .update(hrpAbsencesTable)
            .set({
                deletedAt: new Date(),
                deletedBy: userId,
                deletionReason: reason,
            })
            .where(eq(hrpAbsencesTable.id, absenceId));

        await aggregateDay(userId, absence.date, absence.contractId);

        return { success: true };
    });
}

export async function deleteAbsenceGroup(userId: string, absenceIds: Array<string>, reason: string): Promise<{ success: boolean }> {
    if (absenceIds.length === 0) {
        return { success: true };
    }

    const absences = await db.query.hrpAbsencesTable.findMany({
        where: sql`${hrpAbsencesTable.id} IN ${absenceIds}`,
    });

    if (absences.some((a) => a.abgerechnet_date)) {
        throw new Error('Einige Abwesenheiten sind bereits abgerechnet und können nicht gelöscht werden.');
    }

    // Prüfung der Berechtigung für alle
    const contractIds = [...new Set(absences.map((a) => a.contractId))];
    for (const contractId of contractIds) {
        const contract = await db.query.hrpContractsTable.findFirst({
            where: and(eq(hrpContractsTable.id, contractId), eq(hrpContractsTable.userId, userId)),
        });
        if (!contract) {
            throw new Error('Berechtigung verweigert');
        }
    }

    // eslint-disable-next-line no-return-await
    return await db.transaction(async (tx) => {
        await tx
            .update(hrpAbsencesTable)
            .set({
                deletedAt: new Date(),
                deletedBy: userId,
                deletionReason: reason,
            })
            .where(sql`${hrpAbsencesTable.id} IN ${absenceIds}`);

        for (const absence of absences) {
            await aggregateDay(userId, absence.date, absence.contractId);
        }

        return { success: true };
    });
}
