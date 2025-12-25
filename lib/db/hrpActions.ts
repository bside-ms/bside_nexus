import { and, eq, gte, isNull, lt } from 'drizzle-orm';
import { groupEntriesByWorkday } from '../hrp/hrpLogic';
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
    // Wir laden den gesamten Monat plus etwas Puffer am Ende, um über Mitternacht gehende Sessions zu erfassen.
    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 1, 23, 59, 59, 999);

    const entries = await db
        .select()
        .from(hrpEventLogTable)
        .where(
            and(
                eq(hrpEventLogTable.userId, userId),
                gte(hrpEventLogTable.loggedTimestamp, startOfMonth),
                lt(hrpEventLogTable.loggedTimestamp, endOfMonth),
                isNull(hrpEventLogTable.deletedAt),
            ),
        )
        .orderBy(hrpEventLogTable.loggedTimestamp);

    const groups = groupEntriesByWorkday(entries);
    const result: Array<Date> = [];

    Object.keys(groups).forEach((dateStr) => {
        const date = new Date(dateStr);
        // Nur Daten des angefragten Monats zurückgeben
        if (date.getFullYear() === year && date.getMonth() === month) {
            result.push(date);
        }
    });

    return result.sort((a, b) => a.getTime() - b.getTime());
};

export const getHrpEntriesForDate = async (
    userId: string,
    year: number,
    month: number,
    day: number,
    includeDeleted = false,
): Promise<Array<Partial<HrpEventLogEntry>>> => {
    // Um eine Session zu finden, die evtl. am Vortag begann oder am Folgetag endet,
    // laden wir einen großzügigen Bereich um den Tag herum.
    const requestedDate = new Date(year, month, day);
    const requestedDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(requestedDate);

    const startRange = new Date(year, month, day - 1, 0, 0, 0, 0);
    const endRange = new Date(year, month, day + 1, 23, 59, 59, 999);

    const whereConditions = [
        eq(hrpEventLogTable.userId, userId),
        gte(hrpEventLogTable.loggedTimestamp, startRange),
        lt(hrpEventLogTable.loggedTimestamp, endRange),
    ];

    if (!includeDeleted) {
        whereConditions.push(isNull(hrpEventLogTable.deletedAt));
    }

    const entries = await db
        .select()
        .from(hrpEventLogTable)
        .where(and(...whereConditions))
        .orderBy(hrpEventLogTable.loggedTimestamp);

    const groups = groupEntriesByWorkday(entries);
    const dayEntries = groups[requestedDateStr] ?? [];

    return dayEntries.map(({ approvedBy, ipAddress, createdAt, userId: user, approvedAt, eventType, ...rest }) => {
        if (!includeDeleted) {
            // Falls nicht angefordert, löschen wir sicherheitshalber auch die Deletion-Felder (sollten eh null sein)

            const { deletedAt, deletedBy, deletionReason, ...filtered } = rest;
            return filtered;
        }
        return rest;
    });
};

export const getHrpLogForUser = async (
    userId: string,
    year: number,
    month: number,
): Promise<Record<number, Array<Partial<HrpEventLogEntry>>>> => {
    // Effizientes Laden aller Einträge für den Monat in einer Query
    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
    // Wir laden bis zum Ende des Folgetages des Monatsendes, um Sessions über Mitternacht zu erfassen
    const endOfRange = new Date(year, month + 1, 2, 0, 0, 0, 0);

    const entries = await db
        .select()
        .from(hrpEventLogTable)
        .where(
            and(
                eq(hrpEventLogTable.userId, userId),
                gte(hrpEventLogTable.loggedTimestamp, startOfMonth),
                lt(hrpEventLogTable.loggedTimestamp, endOfRange),
                isNull(hrpEventLogTable.deletedAt),
            ),
        )
        .orderBy(hrpEventLogTable.loggedTimestamp);

    const groups = groupEntriesByWorkday(entries);
    const byDay: Record<number, Array<Partial<HrpEventLogEntry>>> = {};

    Object.entries(groups).forEach(([dateStr, dayEntries]) => {
        const date = new Date(dateStr);
        if (date.getFullYear() === year && date.getMonth() === month) {
            byDay[date.getDate()] = dayEntries.map(
                ({ approvedBy, ipAddress, deletedAt, createdAt, userId: user, approvedAt, eventType, ...rest }) => rest,
            );
        }
    });

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
    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 2, 0, 0, 0, 0); // Puffer

    // Fetch distinct users with entries in the range
    const rows = await db
        .select({
            userId: hrpEventLogTable.userId,
            username: usersTable.username,
            displayName: usersTable.displayName,
        })
        .from(hrpEventLogTable)
        .leftJoin(usersTable, eq(usersTable.id, hrpEventLogTable.userId))
        .where(
            and(
                gte(hrpEventLogTable.loggedTimestamp, startOfMonth),
                lt(hrpEventLogTable.loggedTimestamp, endOfMonth),
                isNull(hrpEventLogTable.deletedAt),
            ),
        );

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

export async function deleteHrpEntry({ id, deletedBy, reason }: { id: string; deletedBy: string; reason: string }): Promise<boolean> {
    await db
        .update(hrpEventLogTable)
        .set({
            deletedAt: new Date(),
            deletedBy,
            deletionReason: reason,
        })
        .where(and(eq(hrpEventLogTable.id, id), eq(hrpEventLogTable.abgerechnet, false)));

    return true;
}
