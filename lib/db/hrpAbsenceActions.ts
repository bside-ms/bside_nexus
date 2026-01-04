import { and, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import type { HrpAbsenceEntry } from '@/db/schema';
import { hrpAbsencesTable, hrpContractsTable, hrpDailyRecordTable } from '@/db/schema';
import { aggregateDay } from '@/lib/hrp/aggregation';
import { differenceInDays, format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export async function createAbsence(
    userId: string,
    data: {
        contractId: string;
        type: 'vacation' | 'sick';
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

    // Hole Feiertage (contractId IS NULL) im Zeitraum
    const globalHolidays = await db.query.hrpAbsencesTable.findMany({
        where: and(
            isNull(hrpAbsencesTable.contractId),
            eq(hrpAbsencesTable.type, 'holiday'),
            gte(hrpAbsencesTable.date, startDate),
            lte(hrpAbsencesTable.date, endDate),
        ),
    });

    const holidayDates = new Set(globalHolidays.map((h) => h.date));

    const absences: Array<typeof hrpAbsencesTable.$inferInsert> = [];
    const dailyRecords: Array<typeof hrpDailyRecordTable.$inferInsert> = [];

    for (let i = 0; i < daysCount; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        const dateStr = format(currentDate, 'yyyy-MM-dd');

        // Überspringe, wenn es ein Feiertag ist
        if (holidayDates.has(dateStr)) {
            continue;
        }

        const workingDaysCount = contract.workingDays?.length || 5;
        const hoursPerDay = contract.weeklyHours ? (contract.weeklyHours / workingDaysCount).toFixed(2) : '0.00';

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
                    sql`${hrpAbsencesTable.type} IN ('vacation', 'sick')`,
                    isNull(hrpAbsencesTable.deletedAt),
                ),
            );

        if (absences.length > 0) {
            await tx.insert(hrpAbsencesTable).values(absences);

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

export async function getUpcomingVacations(userId: string): Promise<Array<HrpAbsenceEntry>> {
    const today = format(new Date(), 'yyyy-MM-dd');

    const contracts = await db.query.hrpContractsTable.findMany({
        where: eq(hrpContractsTable.userId, userId),
    });

    const contractIds = contracts.map((c) => c.id);

    if (contractIds.length === 0) {
        return [];
    }

    return db.query.hrpAbsencesTable.findMany({
        where: and(
            sql`${hrpAbsencesTable.contractId} IN ${contractIds}`,
            eq(hrpAbsencesTable.type, 'vacation'),
            gte(hrpAbsencesTable.date, today),
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
