import { and, eq, gte, lt } from 'drizzle-orm';
import { db } from '@/db';
import type { HrpEventLogEntry } from '@/db/schema';
import { usersTable } from '@/db/schema';
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

export const getHrpLogForUser = async (
    userId: string,
    year: number,
    month: number,
): Promise<Record<number, Array<Partial<HrpEventLogEntry>>>> => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const results = await Promise.all(
        Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            return getHrpEntriesForDate(userId, year, month, day).then((entries) => ({
                day,
                entries,
            }));
        }),
    );

    const byDay: Record<number, Array<Partial<HrpEventLogEntry>>> = {};
    for (const { day, entries } of results) {
        byDay[day] = entries;
    }

    return byDay;
};

export const getHrpLogsForAllUsers = async (
    year: number,
    month: number,
): Promise<
    Record<
        string,
        {
            user: { id: string; username: string; displayName: string | null };
            logs: Record<number, Array<Partial<HrpEventLogEntry>>>;
        }
    >
> => {
    const startOfMonth = new Date(year, month, 1, 7, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 1, 7, 0, 0, 0);

    // Fetch distinct users with entries in the month, including username/displayName
    const rows = await db
        .select({
            userId: hrpEventLogTable.userId,
            username: usersTable.username,
            displayName: usersTable.displayName,
        })
        .from(hrpEventLogTable)
        .leftJoin(usersTable, eq(usersTable.id, hrpEventLogTable.userId))
        .where(and(gte(hrpEventLogTable.loggedTimestamp, startOfMonth), lt(hrpEventLogTable.loggedTimestamp, endOfMonth)));

    const userMeta = new Map<string, { username: string; displayName: string | null }>();
    for (const r of rows) {
        if (!r.userId) {
            continue;
        }
        // username is non-nullable in schema; displayName can be null
        userMeta.set(r.userId, { username: r.username ?? r.userId, displayName: r.displayName ?? null });
    }

    const userIds = Array.from(userMeta.keys());

    const perUser = await Promise.all(
        userIds.map(async (uid) => {
            const logs = await getHrpLogForUser(uid, year, month);
            const meta = userMeta.get(uid)!;
            return [
                uid,
                {
                    user: { id: uid, username: meta.username, displayName: meta.displayName },
                    logs,
                },
            ] as const;
        }),
    );

    const result: Record<
        string,
        { user: { id: string; username: string; displayName: string | null }; logs: Record<number, Array<Partial<HrpEventLogEntry>>> }
    > = {};
    for (const [uid, value] of perUser) {
        result[uid] = value;
    }

    return result;
};
