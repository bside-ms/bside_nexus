import { and, eq, gte, isNull, lt } from 'drizzle-orm';
import { db } from '@/db';
import { hrpDailyRecordTable, hrpEventLogTable } from '@/db/schema';
import { computeDayStats, groupEntriesByWorkday } from '@/lib/hrp/hrpLogic';
import { v4 as uuidv4 } from 'uuid';

export async function aggregateDay(userId: string, dateString: string, contractId: string): Promise<void> {
    const start = new Date(`${dateString}T00:00:00`);

    const rawLogs = await db.query.hrpEventLogTable.findMany({
        where: and(
            eq(hrpEventLogTable.userId, userId),
            gte(hrpEventLogTable.loggedTimestamp, start),
            lt(hrpEventLogTable.loggedTimestamp, new Date(start.getTime() + 48 * 60 * 60 * 1000)),
            isNull(hrpEventLogTable.deletedAt),
        ),
    });

    // Gruppieren mit der neuen Logic (Nachtschicht berücksichtigen)
    const grouped = groupEntriesByWorkday(rawLogs);
    const dayLogs = grouped[dateString] || [];
    const stats = computeDayStats(dayLogs);

    const recordValues = {
        userId,
        contractId,
        date: dateString,
        totalWorkHours: (stats.netMinutes / 60).toFixed(2),
        totalBreakHours: (stats.adjustedBreakMinutes / 60).toFixed(2),
        hasErrors: stats.issues.length > 0,
        errorDetails: stats.issues.join(', '),
        updatedAt: new Date(),
    };

    await db
        .insert(hrpDailyRecordTable)
        .values({
            id: uuidv4(),
            ...recordValues,
        })
        .onConflictDoUpdate({
            target: [hrpDailyRecordTable.userId, hrpDailyRecordTable.date, hrpDailyRecordTable.contractId],
            set: recordValues,
        });
}
