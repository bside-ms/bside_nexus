import { and, eq, gte, lt } from 'drizzle-orm';
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
    const startOfMonth = new Date(year, month, 1, 7, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 1, 7, 0, 0, 0);

    const entries = await db
        .select()
        .from(hrpEventLogTable)
        .where(
            and(
                eq(hrpEventLogTable.userId, userId),
                gte(hrpEventLogTable.loggedTimestamp, startOfMonth),
                lt(hrpEventLogTable.loggedTimestamp, endOfMonth),
            ),
        )
        .orderBy(hrpEventLogTable.loggedTimestamp);

    const daysSeen = new Set<string>();
    const result: Array<Date> = [];
    for (const entry of entries) {
        // A "day" starts at 7am. To find the correct calendar day for an entry,
        // we can subtract 7 hours from its timestamp. This shifts the "day start" to midnight.
        const adjustedTimestamp = new Date(entry.loggedTimestamp.getTime() - 7 * 60 * 60 * 1000);

        // We use the UTC date string 'YYYY-MM-DD' for grouping to avoid timezone issues.
        const dateString = adjustedTimestamp.toISOString().substring(0, 10);

        if (!daysSeen.has(dateString)) {
            daysSeen.add(dateString);
            // We return a new Date object representing the start of that day in UTC.
            // The frontend will handle displaying it in the user's local timezone.
            result.push(new Date(dateString));
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
    const startOfDay = new Date(year, month, day, 7, 0, 0, 0);
    const endOfDay = new Date(year, month, day + 1, 7, 0, 0, 0);

    const entries = await db
        .select()
        .from(hrpEventLogTable)
        .where(
            and(
                eq(hrpEventLogTable.userId, userId),
                gte(hrpEventLogTable.loggedTimestamp, startOfDay),
                lt(hrpEventLogTable.loggedTimestamp, endOfDay),
            ),
        )
        .orderBy(hrpEventLogTable.loggedTimestamp);

    return entries.map(({ approvedBy, ipAddress, deletedAt, createdAt, userId: user, approvedAt, eventType, ...rest }) => rest);
};
