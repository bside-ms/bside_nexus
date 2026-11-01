import { and, eq, gte, inArray, isNull, lt, or } from 'drizzle-orm';
import { db } from '@/db';
import type { HrpEventLogEntry } from '@/db/schema';
import { hrpEventLogTable } from '@/db/schema';
import { getContractChainIds } from '@/lib/db/contractActions';
import { getPayrollFixedEntriesForUser, recalculatePayrollFixedForUserAtDate } from '@/lib/db/hrpAdminActions';
import { aggregateDay } from '@/lib/hrp/aggregation';
import type { HrpAdminActor } from '@/lib/hrp/corrections';
import { buildCorrectionComment, buildCorrectionNote, HrpValidationError } from '@/lib/hrp/corrections';
import type { Entry } from '@/lib/hrp/hrpLogic';
import { computeDayStats, groupEntriesByWorkday, toBerlinDateString } from '@/lib/hrp/hrpLogic';
import { v4 as uuidv4 } from 'uuid';

export const HRP_ENTRY_TYPES = ['start', 'pause', 'pause_end', 'stop'] as const;
export type HrpEntryType = (typeof HRP_ENTRY_TYPES)[number];

// Wird nicht ausgewertet. Nur zur Nachvollziehbarkeit.
export const ADMIN_EVENT_TYPE = 'admin';

export interface HrpEntryChange {
    entryType: HrpEntryType;
    timestamp: Date;
}

export interface DayPreview {
    date: string;
    before: { netMinutes: number; issues: Array<string> };
    after: { netMinutes: number; issues: Array<string> };
}

export async function getActiveHrpEntry(id: string): Promise<HrpEventLogEntry | null> {
    return (
        (await db.query.hrpEventLogTable.findFirst({ where: and(eq(hrpEventLogTable.id, id), isNull(hrpEventLogTable.deletedAt)) })) ?? null
    );
}

/**
 * Tagesaggregation nachziehen und vorhandene Festgehalts-Abrechnungen der Monate neu berechnen.
 * Neue Abrechnungen werden nicht erstellt.
 */
async function refreshDerivedData(userId: string, contractId: string, timestamps: Array<Date>): Promise<void> {
    const dates = [...new Set(timestamps.map((ts) => toBerlinDateString(ts)))];
    for (const date of dates) {
        await aggregateDay(userId, date, contractId);
    }

    const months = [...new Set(dates.map((date) => date.slice(0, 7)))];
    for (const yearMonth of months) {
        const year = Number(yearMonth.slice(0, 4));
        const month = Number(yearMonth.slice(5, 7)) - 1;
        const existing = await getPayrollFixedEntriesForUser(userId, year);
        if (existing.some((entry) => entry.month === month)) {
            await recalculatePayrollFixedForUserAtDate(userId, year, month);
        }
    }
}

export async function createHrpEntryAsAdmin({
    actor,
    userId,
    contractId,
    change,
}: {
    actor: HrpAdminActor;
    userId: string;
    contractId: string;
    change: HrpEntryChange;
}): Promise<HrpEventLogEntry> {
    const inserted = await db
        .insert(hrpEventLogTable)
        .values({
            id: uuidv4(),
            userId,
            contractId,
            ipAddress: actor.ipAddress,
            entryType: change.entryType,
            eventType: ADMIN_EVENT_TYPE,
            loggedTimestamp: change.timestamp,
            comment: buildCorrectionComment(buildCorrectionNote(actor), null),
            abgerechnet: false,
        })
        .returning();

    if (inserted[0] === undefined) {
        throw new Error('Die Buchung konnte nicht gespeichert werden.');
    }

    await refreshDerivedData(userId, contractId, [change.timestamp]);
    return inserted[0];
}

export async function correctHrpEntryAsAdmin({
    actor,
    entry,
    change,
}: {
    actor: HrpAdminActor;
    entry: HrpEventLogEntry;
    change: HrpEntryChange;
}): Promise<HrpEventLogEntry> {
    if (entry.contractId === null) {
        throw new HrpValidationError('Die Buchung ist keinem Vertrag zugeordnet.');
    }
    const contractId = entry.contractId;
    const note = buildCorrectionNote(actor);
    const newId = uuidv4();

    const inserted = await db.transaction(async (tx) => {
        const deleted = await tx
            .update(hrpEventLogTable)
            .set({ deletedAt: new Date(), deletedBy: actor.userId, deletionReason: `${note} (ersetzt durch ${newId})` })
            .where(and(eq(hrpEventLogTable.id, entry.id), isNull(hrpEventLogTable.deletedAt), eq(hrpEventLogTable.abgerechnet, false)))
            .returning({ id: hrpEventLogTable.id });

        // Inzwischen gelöscht oder abgerechnet.
        if (deleted.length === 0) {
            throw new HrpValidationError('Die Buchung wurde inzwischen gelöscht oder abgerechnet.');
        }

        return tx
            .insert(hrpEventLogTable)
            .values({
                id: newId,
                userId: entry.userId,
                contractId,
                ipAddress: actor.ipAddress,
                entryType: change.entryType,
                eventType: ADMIN_EVENT_TYPE,
                loggedTimestamp: change.timestamp,
                comment: buildCorrectionComment(note, entry.comment),
                abgerechnet: false,
            })
            .returning();
    });

    if (inserted[0] === undefined) {
        throw new Error('Die Buchung konnte nicht gespeichert werden.');
    }

    await refreshDerivedData(entry.userId, contractId, [entry.loggedTimestamp, change.timestamp]);
    return inserted[0];
}

export async function deleteHrpEntryAsAdmin({ actor, entry }: { actor: HrpAdminActor; entry: HrpEventLogEntry }): Promise<void> {
    const deleted = await db
        .update(hrpEventLogTable)
        .set({ deletedAt: new Date(), deletedBy: actor.userId, deletionReason: buildCorrectionNote(actor) })
        .where(and(eq(hrpEventLogTable.id, entry.id), isNull(hrpEventLogTable.deletedAt), eq(hrpEventLogTable.abgerechnet, false)))
        .returning({ id: hrpEventLogTable.id });

    if (deleted.length === 0) {
        throw new HrpValidationError('Die Buchung wurde inzwischen gelöscht oder abgerechnet.');
    }

    if (entry.contractId !== null) {
        await refreshDerivedData(entry.userId, entry.contractId, [entry.loggedTimestamp]);
    }
}

/**
 * DryRun der betroffenen Arbeitstage.
 */
export async function previewHrpEntryChange({
    userId,
    contractId,
    removeId,
    add,
}: {
    userId: string;
    contractId: string;
    removeId?: string;
    add?: HrpEntryChange;
}): Promise<Array<DayPreview>> {
    const removed = removeId === undefined ? null : await getActiveHrpEntry(removeId);
    const timestamps = [removed?.loggedTimestamp, add?.timestamp].filter((ts): ts is Date => ts instanceof Date);
    if (timestamps.length === 0) {
        return [];
    }

    // Zwei Tage Puffer für Nachtschichten.
    const from = new Date(Math.min(...timestamps.map((ts) => ts.getTime())) - 2 * 24 * 60 * 60 * 1000);
    const to = new Date(Math.max(...timestamps.map((ts) => ts.getTime())) + 2 * 24 * 60 * 60 * 1000);
    const chainIds = await getContractChainIds(contractId);

    const entries: Array<Entry> = await db
        .select({ id: hrpEventLogTable.id, entryType: hrpEventLogTable.entryType, loggedTimestamp: hrpEventLogTable.loggedTimestamp })
        .from(hrpEventLogTable)
        .where(
            and(
                eq(hrpEventLogTable.userId, userId),
                or(inArray(hrpEventLogTable.contractId, chainIds), isNull(hrpEventLogTable.contractId)),
                gte(hrpEventLogTable.loggedTimestamp, from),
                lt(hrpEventLogTable.loggedTimestamp, to),
                isNull(hrpEventLogTable.deletedAt),
            ),
        );

    const NEW_ID = 'new';
    const after = [
        ...entries.filter((e) => e.id !== removeId),
        ...(add === undefined ? [] : [{ id: NEW_ID, entryType: add.entryType, loggedTimestamp: add.timestamp }]),
    ];

    const groupsBefore = groupEntriesByWorkday(entries);
    const groupsAfter = groupEntriesByWorkday(after);

    // Alle Arbeitstage, deren Buchungen sich ändern.
    const idsOf = (dayEntries: Array<Entry> | undefined): string =>
        (dayEntries ?? [])
            .map((e) => e.id ?? '')
            .sort()
            .join(',');
    const affectedDays = [...new Set([...Object.keys(groupsBefore), ...Object.keys(groupsAfter)])]
        .filter((day) => idsOf(groupsBefore[day]) !== idsOf(groupsAfter[day]))
        .sort();

    const summarize = (dayEntries: Array<Entry> | undefined): DayPreview['before'] => {
        const stats = computeDayStats(dayEntries ?? []);
        return { netMinutes: stats.netMinutes, issues: stats.issues };
    };

    return affectedDays.map((date) => ({ date, before: summarize(groupsBefore[date]), after: summarize(groupsAfter[date]) }));
}
