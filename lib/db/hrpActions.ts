import { and, eq, gte, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { groupEntriesByWorkday } from '../hrp/hrpLogic';
import { db } from '@/db';
import type { HrpAbsenceEntry, HrpEventLogEntry } from '@/db/schema';
import { hrpAbsencesTable, usersTable } from '@/db/schema';
import { hrpEventLogTable } from '@/db/schema';
import { v4 as uuidv4 } from 'uuid';

export async function writeHrpEntry({
    userId,
    ipAddress,
    contractId,
    entryType,
    eventType,
    timestamp,
    comment,
    abgerechnet = false,
}: {
    userId: string;
    ipAddress: string;
    contractId: string;
    entryType: string;
    eventType: string;
    timestamp: Date;
    comment: string | null;
    abgerechnet: boolean;
}): Promise<HrpEventLogEntry> {
    const id = uuidv4();

    const newEntry = {
        id,
        userId,
        ipAddress,
        contractId,
        entryType,
        eventType,
        loggedTimestamp: timestamp,
        comment,
        abgerechnet,
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

    const startOfMonthStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(startOfMonth);
    const endOfMonthStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(endOfMonth);

    const [entries, absences] = await Promise.all([
        db
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
            .orderBy(hrpEventLogTable.loggedTimestamp),
        db.query.hrpAbsencesTable.findMany({
            where: and(
                or(
                    // Persönliche Abwesenheiten
                    sql`${hrpAbsencesTable.contractId} IN (SELECT id FROM hrp_contracts WHERE "userId" = ${userId})`,
                    // Feiertage
                    isNull(hrpAbsencesTable.contractId),
                ),
                gte(hrpAbsencesTable.date, startOfMonthStr),
                lte(hrpAbsencesTable.date, endOfMonthStr),
                isNull(hrpAbsencesTable.deletedAt),
            ),
        }),
    ]);

    const groups = groupEntriesByWorkday(entries);
    const resultDates = new Set<string>();

    Object.keys(groups).forEach((dateStr) => {
        const date = new Date(dateStr);
        if (date.getFullYear() === year && date.getMonth() === month) {
            resultDates.add(dateStr);
        }
    });

    for (const absence of absences) {
        const date = new Date(absence.date);
        if (date.getFullYear() === year && date.getMonth() === month) {
            resultDates.add(absence.date);
        }
    }

    return Array.from(resultDates)
        .map((d) => new Date(d))
        .sort((a, b) => a.getTime() - b.getTime());
};

export const getHrpEntriesForDate = async (
    userId: string,
    year: number,
    month: number,
    day: number,
    includeDeleted = false,
    contractId?: string | null,
): Promise<Array<Partial<HrpEventLogEntry & { absence?: HrpAbsenceEntry }>>> => {
    // Um eine Session zu finden, die evtl. am Vortag begann oder am Folgetag endet, großzügig laden.
    const requestedDate = new Date(year, month, day);

    // Grouping bei YYYY-MM-DD.
    const requestedDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(requestedDate);

    // Wir laden von "Gestern 00:00" bis "Morgen 23:59"
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

    if (contractId) {
        whereConditions.push(eq(hrpEventLogTable.contractId, contractId));
    }

    const [entries, absences] = await Promise.all([
        db
            .select()
            .from(hrpEventLogTable)
            .where(and(...whereConditions))
            .orderBy(hrpEventLogTable.loggedTimestamp),
        db.query.hrpAbsencesTable.findMany({
            where: and(
                or(
                    // Persönliche Abwesenheiten
                    sql`${hrpAbsencesTable.contractId} IN (SELECT id FROM hrp_contracts WHERE "userId" = ${userId})`,
                    // Feiertage
                    isNull(hrpAbsencesTable.contractId),
                ),
                eq(hrpAbsencesTable.date, requestedDateStr),
                isNull(hrpAbsencesTable.deletedAt),
            ),
        }),
    ]);

    const groups = groupEntriesByWorkday(entries);
    const dayEntries = groups[requestedDateStr] ?? [];

    const formattedEntries: Array<Record<string, unknown>> = dayEntries.map(
        ({ approvedBy, ipAddress, createdAt, userId: user, approvedAt, eventType, ...rest }) => {
            if (!includeDeleted) {
                const { deletedAt, deletedBy, deletionReason, ...filtered } = rest;
                return filtered;
            }
            return rest;
        },
    );

    for (const absence of absences) {
        formattedEntries.push({
            id: absence.id,
            entryType: 'absence',
            loggedTimestamp: new Date(absence.date),
            contractId: absence.contractId,
            absence,
        });
    }

    return formattedEntries;
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
