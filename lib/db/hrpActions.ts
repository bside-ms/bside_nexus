import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/db';
import type { HrpEventLogEntry } from '@/db/schema';
import { hrpEventLogTable } from '@/db/schema';
import { v4 as uuidv4 } from 'uuid';

export async function writeHrpEntry({
    userId,
    ipAddress,
    entryType,
    eventType,
    timestamp,
    comment,
}: {
    userId: string;
    ipAddress: string;
    entryType: string;
    eventType: string;
    timestamp: Date;
    comment: string | null;
}): Promise<HrpEventLogEntry> {
    const id = uuidv4();

    const newEntry = {
        id,
        userId,
        ipAddress,
        entryType,
        eventType,
        loggedTimestamp: timestamp,
        comment,
    };

    const insertedEntry = await db.insert(hrpEventLogTable).values(newEntry).returning();

    if (insertedEntry.length <= 0 || insertedEntry[0] === undefined) {
        throw new Error('Failed to insert HRP log entry');
    }

    return insertedEntry[0];
}

export const getDatesWithHrpEntries = async (userId: string, year: number, month: number): Promise<Array<Date>> => {
    const startOfMonth = new Date(Date.UTC(year, month, 1));
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    const entries = await db
        .select()
        .from(hrpEventLogTable)
        .where(
            and(
                eq(hrpEventLogTable.userId, userId),
                gte(hrpEventLogTable.loggedTimestamp, startOfMonth),
                lte(hrpEventLogTable.loggedTimestamp, endOfMonth),
            ),
        )
        .orderBy(hrpEventLogTable.loggedTimestamp);

    const daysSeen = new Set<string>();
    const result: Array<Date> = [];
    for (const entry of entries) {
        const localDateStr = entry.loggedTimestamp.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' });

        if (!daysSeen.has(localDateStr)) {
            daysSeen.add(localDateStr);
            result.push(entry.loggedTimestamp);
        }
    }

    return result;
};

export const getHrpEntriesForDate = async (
    userId: string,
    year: number,
    month: number,
    day: number,
): Promise<Array<Partial<HrpEventLogEntry>>> => {
    const startOfDay = new Date(year, month, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month, day, 23, 59, 59, 999);

    const entries = await db
        .select()
        .from(hrpEventLogTable)
        .where(
            and(
                eq(hrpEventLogTable.userId, userId),
                gte(hrpEventLogTable.loggedTimestamp, startOfDay),
                lte(hrpEventLogTable.loggedTimestamp, endOfDay),
            ),
        )
        .orderBy(hrpEventLogTable.loggedTimestamp);

    return entries.map(({ approvedBy, ipAddress, deletedAt, createdAt, userId: user, approvedAt, eventType, ...rest }) => rest);
};
