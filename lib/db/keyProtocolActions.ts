import { and, asc, count, desc, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import type { KeyProtocolEntry, KeyProtocolRecipient, UserProfileEntry } from '@/db/schema';
import { keyProtocolFilesTable, keyProtocolItemsTable, keyProtocolsTable, keysBaseTable, userProfilesTable } from '@/db/schema';
import type { KeyDeletionKind, KeyLineType, KeyProfileKind, KeyProtocolType } from '@/lib/key/constants';
import {
    formatKeyNr,
    formatProfileName,
    KEY_DELETION_KIND_LABELS,
    KEY_PROTOCOL_MAX_LINES,
    KEY_PROTOCOL_TYPE_LABELS,
    normalizeTransponderSerial,
    toKeyDeletionKind,
    toKeyProfileKind,
    toKeyProtocolType,
} from '@/lib/key/constants';
import { KeyActionError } from '@/lib/key/errors';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Transaction;

// ---
// Holdings
// ---

// Issuances count positive, returns and losses negative. Cancelled protocols don't count.
const netQuantity = sql<number>`coalesce(sum(case when ${keyProtocolsTable.protocolType} = 'issuance' then ${keyProtocolItemsTable.quantity} else -${keyProtocolItemsTable.quantity} end), 0)`;

export interface NetHolding {
    userProfileId: string;
    lineType: KeyLineType;
    keyTypeId: string | null;
    transponderSerial: string | null;
    quantity: number;
}

// What every profile holds: one row per profile and key type or transponder.
export const listNetHoldings = async (filter: { userProfileId?: string; keyTypeId?: string } = {}): Promise<Array<NetHolding>> => {
    const conditions = [isNull(keyProtocolsTable.deletedAt)];
    if (filter.userProfileId !== undefined) {
        conditions.push(eq(keyProtocolsTable.userProfileId, filter.userProfileId));
    }
    if (filter.keyTypeId !== undefined) {
        conditions.push(eq(keyProtocolItemsTable.keyTypeId, filter.keyTypeId));
    }

    const rows = await db
        .select({
            userProfileId: keyProtocolsTable.userProfileId,
            lineType: keyProtocolItemsTable.lineType,
            keyTypeId: keyProtocolItemsTable.keyTypeId,
            transponderSerial: keyProtocolItemsTable.transponderSerial,
            quantity: netQuantity.mapWith(Number),
        })
        .from(keyProtocolItemsTable)
        .innerJoin(keyProtocolsTable, eq(keyProtocolItemsTable.protocolId, keyProtocolsTable.id))
        .where(and(...conditions))
        .groupBy(
            keyProtocolsTable.userProfileId,
            keyProtocolItemsTable.lineType,
            keyProtocolItemsTable.keyTypeId,
            keyProtocolItemsTable.transponderSerial,
        )
        .having(sql`${netQuantity} > 0`);

    return rows.map((row) => ({ ...row, lineType: row.lineType === 'transponder' ? 'transponder' : 'key' }));
};

export interface HoldingIssuance {
    protocolId: string;
    protocolNumber: string;
    quantity: number;
}

export interface KeyHolding {
    keyTypeId: string;
    keyNr: number;
    keyDescription: string;
    quantity: number;
    // Open issuances, oldest first. Returns are booked against them.
    issuances: Array<HoldingIssuance>;
}

export interface TransponderHolding {
    serial: string;
    description: string;
    issuances: Array<HoldingIssuance>;
}

export interface ProfileHoldings {
    keys: Array<KeyHolding>;
    transponders: Array<TransponderHolding>;
}

interface HoldingGroup {
    lineType: KeyLineType;
    keyTypeId: string | null;
    keyNr: number | null;
    keyDescription: string | null;
    serial: string | null;
    description: string;
    issuances: Array<HoldingIssuance>;
    referenced: Map<string, number>;
    unreferenced: number;
}

/**
 * Open issuances per key type and transponder.
 * A return with a reference reduces its issuance, one without (old receipts) the oldest open one.
 */
export const getProfileHoldings = async (userProfileId: string, executor: Executor = db): Promise<ProfileHoldings> => {
    const lines = await executor
        .select({
            protocolId: keyProtocolsTable.id,
            protocolNumber: keyProtocolsTable.protocolNumber,
            protocolType: keyProtocolsTable.protocolType,
            lineType: keyProtocolItemsTable.lineType,
            keyTypeId: keyProtocolItemsTable.keyTypeId,
            keyNr: keysBaseTable.keyNr,
            keyDescription: keysBaseTable.keyDescription,
            quantity: keyProtocolItemsTable.quantity,
            transponderSerial: keyProtocolItemsTable.transponderSerial,
            description: keyProtocolItemsTable.description,
            issuanceProtocolId: keyProtocolItemsTable.issuanceProtocolId,
        })
        .from(keyProtocolItemsTable)
        .innerJoin(keyProtocolsTable, eq(keyProtocolItemsTable.protocolId, keyProtocolsTable.id))
        .leftJoin(keysBaseTable, eq(keyProtocolItemsTable.keyTypeId, keysBaseTable.id))
        .where(and(eq(keyProtocolsTable.userProfileId, userProfileId), isNull(keyProtocolsTable.deletedAt)))
        .orderBy(asc(keyProtocolsTable.protocolNumber), asc(keyProtocolItemsTable.position));

    const groups = new Map<string, HoldingGroup>();
    for (const line of lines) {
        const isTransponder = line.lineType === 'transponder';
        const groupKey = isTransponder ? `t:${line.transponderSerial ?? ''}` : `k:${line.keyTypeId ?? ''}`;
        let group = groups.get(groupKey);
        if (group === undefined) {
            group = {
                lineType: isTransponder ? 'transponder' : 'key',
                keyTypeId: line.keyTypeId,
                keyNr: line.keyNr,
                keyDescription: line.keyDescription,
                serial: line.transponderSerial,
                description: line.description ?? '',
                issuances: [],
                referenced: new Map(),
                unreferenced: 0,
            };
            groups.set(groupKey, group);
        }

        if (line.protocolType === 'issuance') {
            group.issuances.push({ protocolId: line.protocolId, protocolNumber: line.protocolNumber, quantity: line.quantity });
            group.description = line.description ?? group.description;
        } else if (line.issuanceProtocolId === null) {
            group.unreferenced += line.quantity;
        } else {
            group.referenced.set(line.issuanceProtocolId, (group.referenced.get(line.issuanceProtocolId) ?? 0) + line.quantity);
        }
    }

    const holdings: ProfileHoldings = { keys: [], transponders: [] };
    for (const group of groups.values()) {
        let unreferenced = group.unreferenced;
        const open: Array<HoldingIssuance> = [];
        for (const issuance of group.issuances) {
            let quantity = Math.max(0, issuance.quantity - (group.referenced.get(issuance.protocolId) ?? 0));
            const fromUnreferenced = Math.min(quantity, unreferenced);
            quantity -= fromUnreferenced;
            unreferenced -= fromUnreferenced;
            if (quantity > 0) {
                open.push({ ...issuance, quantity });
            }
        }

        const total = open.reduce((sum, issuance) => sum + issuance.quantity, 0);
        if (total === 0) {
            continue;
        }
        if (group.lineType === 'transponder' && group.serial !== null) {
            holdings.transponders.push({ serial: group.serial, description: group.description, issuances: open });
        } else if (group.keyTypeId !== null) {
            holdings.keys.push({
                keyTypeId: group.keyTypeId,
                keyNr: group.keyNr ?? 0,
                keyDescription: group.keyDescription ?? '',
                quantity: total,
                issuances: open,
            });
        }
    }

    holdings.keys.sort((a, b) => a.keyNr - b.keyNr);
    holdings.transponders.sort((a, b) => a.serial.localeCompare(b.serial));
    return holdings;
};

// ---
// Creating protocols
// ---

export type ProtocolLineInput =
    | { lineType: 'key'; keyTypeId: string; quantity: number }
    | { lineType: 'transponder'; transponderSerial: string; description?: string | null };

export interface CreateProtocolsInput {
    protocolType: KeyProtocolType;
    userProfileId: string;
    lines: Array<ProtocolLineInput>;
    comment?: string | null;
}

export interface ProtocolActor {
    userId: string | null;
    displayName: string | null;
}

export interface CreatedProtocol {
    id: string;
    protocolNumber: string;
}

interface ResolvedLine {
    lineType: KeyLineType;
    keyTypeId: string | null;
    quantity: number;
    transponderSerial: string | null;
    description: string;
    issuanceProtocolId: string | null;
}

export const buildRecipientSnapshot = (profile: UserProfileEntry): KeyProtocolRecipient => {
    const street = [profile.addressStreet, profile.addressHouseNumber].filter((part) => (part ?? '') !== '').join(' ');
    const city = [profile.addressZipCode, profile.addressCity].filter((part) => (part ?? '') !== '').join(' ');
    return {
        name: formatProfileName(profile),
        profileNumber: profile.profileNumber,
        address: [street, city].filter((part) => part !== '').join(', '),
        mail: profile.emailAddress ?? '',
        phone: profile.phoneNumber ?? '',
    };
};

// Highest number + 1, four digits. Imported numbers like "0062a" count as 62.
const getNextProtocolNumber = async (tx: Transaction): Promise<string> => {
    const [row] = await tx
        .select({
            max: sql<number | null>`max(cast(substring(${keyProtocolsTable.protocolNumber} from '^[0-9]+') as integer))`.mapWith(Number),
        })
        .from(keyProtocolsTable);
    const next = (row?.max ?? 0) + 1;
    return String(next).padStart(4, '0');
};

const resolveIssuanceLines = async (tx: Transaction, lines: Array<ProtocolLineInput>): Promise<Array<ResolvedLine>> => {
    const keyQuantities = new Map<string, number>();
    const transponders = new Map<string, string>();
    for (const line of lines) {
        if (line.lineType === 'key') {
            keyQuantities.set(line.keyTypeId, (keyQuantities.get(line.keyTypeId) ?? 0) + line.quantity);
        } else {
            const serial = normalizeTransponderSerial(line.transponderSerial);
            if (transponders.has(serial)) {
                throw new KeyActionError(`Der Transponder ${serial} steht doppelt in der Liste.`);
            }
            transponders.set(serial, line.description?.trim() ?? '');
        }
    }

    const keyTypeIds = [...keyQuantities.keys()];
    const keyTypes =
        keyTypeIds.length === 0
            ? []
            : await tx
                  .select()
                  .from(keysBaseTable)
                  .where(and(inArray(keysBaseTable.id, keyTypeIds), isNull(keysBaseTable.deleteAt)))
                  .orderBy(asc(keysBaseTable.keyNr));
    if (keyTypes.length !== keyTypeIds.length) {
        throw new KeyActionError('Mindestens eine Schließung gibt es nicht (mehr).');
    }

    return [
        ...keyTypes.map((keyType): ResolvedLine => ({
            lineType: 'key',
            keyTypeId: keyType.id,
            quantity: keyQuantities.get(keyType.id) ?? 1,
            transponderSerial: null,
            description: keyType.keyDescription,
            issuanceProtocolId: null,
        })),
        ...[...transponders.entries()].map(([serial, description]): ResolvedLine => ({
            lineType: 'transponder',
            keyTypeId: null,
            quantity: 1,
            transponderSerial: serial,
            description: description === '' ? 'Transponder' : description,
            issuanceProtocolId: null,
        })),
    ];
};

/**
 * Books returns and losses against the open issuances, oldest first.
 * If the keys come from several issuances, the line is split, so the receipt names each issuance.
 */
const resolveReturnLines = async (
    tx: Transaction,
    userProfileId: string,
    lines: Array<ProtocolLineInput>,
): Promise<Array<ResolvedLine>> => {
    const holdings = await getProfileHoldings(userProfileId, tx);
    const keyQuantities = new Map<string, number>();
    const serials = new Set<string>();
    for (const line of lines) {
        if (line.lineType === 'key') {
            keyQuantities.set(line.keyTypeId, (keyQuantities.get(line.keyTypeId) ?? 0) + line.quantity);
        } else {
            serials.add(normalizeTransponderSerial(line.transponderSerial));
        }
    }

    const resolved: Array<ResolvedLine> = [];
    for (const [keyTypeId, requested] of keyQuantities) {
        const holding = holdings.keys.find((entry) => entry.keyTypeId === keyTypeId);
        if (holding === undefined || holding.quantity < requested) {
            const label = holding === undefined ? 'diese Schließung' : `Schließung ${formatKeyNr(holding.keyNr)}`;
            throw new KeyActionError(`Von ${label} sind weniger Schlüssel ausgegeben als angegeben.`);
        }
        let remaining = requested;
        for (const issuance of holding.issuances) {
            if (remaining === 0) {
                break;
            }
            const quantity = Math.min(remaining, issuance.quantity);
            remaining -= quantity;
            resolved.push({
                lineType: 'key',
                keyTypeId,
                quantity,
                transponderSerial: null,
                description: holding.keyDescription,
                issuanceProtocolId: issuance.protocolId,
            });
        }
    }

    for (const serial of serials) {
        const holding = holdings.transponders.find((entry) => entry.serial === serial);
        const issuance = holding?.issuances.at(-1);
        if (holding === undefined || issuance === undefined) {
            throw new KeyActionError(`Der Transponder ${serial} ist laut Quittungen nicht ausgegeben.`);
        }
        resolved.push({
            lineType: 'transponder',
            keyTypeId: null,
            quantity: 1,
            transponderSerial: serial,
            description: holding.description,
            issuanceProtocolId: issuance.protocolId,
        });
    }

    return resolved;
};

const todayIsoDate = (): string => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
};

const adjustTotalQuantity = async (tx: Transaction, keyTypeId: string, delta: number): Promise<void> => {
    await tx
        .update(keysBaseTable)
        .set({
            totalQuantity: sql`greatest(${keysBaseTable.totalQuantity} + ${delta}, 0)`,
            updatedAt: new Date(),
        })
        .where(and(eq(keysBaseTable.id, keyTypeId), sql`${keysBaseTable.totalQuantity} is not null`));
};

/**
 * Creates an issuance, return or loss. Every 4 lines become one protocol.
 * This function is triggered by the /api/key/protocols endpoint.
 */
export const createProtocols = async (input: CreateProtocolsInput, actor: ProtocolActor): Promise<Array<CreatedProtocol>> => {
    if (input.lines.length === 0) {
        throw new KeyActionError('Bitte gib mindestens eine Zeile an.');
    }

    return db.transaction(async (tx) => {
        // Serializes the number assignment. Protocols are rare, so the lock costs nothing.
        await tx.execute(sql`LOCK TABLE ${keyProtocolsTable} IN SHARE ROW EXCLUSIVE MODE`);

        const [profile] = await tx
            .select()
            .from(userProfilesTable)
            .where(and(eq(userProfilesTable.id, input.userProfileId), isNull(userProfilesTable.deleteAt)))
            .limit(1);
        if (profile === undefined) {
            throw new KeyActionError('Das Profil gibt es nicht (mehr).', 404);
        }

        const lines =
            input.protocolType === 'issuance'
                ? await resolveIssuanceLines(tx, input.lines)
                : await resolveReturnLines(tx, profile.id, input.lines);

        const recipient = buildRecipientSnapshot(profile);
        const created: Array<CreatedProtocol> = [];
        for (let start = 0; start < lines.length; start += KEY_PROTOCOL_MAX_LINES) {
            const chunk = lines.slice(start, start + KEY_PROTOCOL_MAX_LINES);
            const protocolId = crypto.randomUUID();
            const protocolNumber = await getNextProtocolNumber(tx);
            await tx.insert(keyProtocolsTable).values({
                id: protocolId,
                protocolNumber,
                protocolType: input.protocolType,
                userProfileId: profile.id,
                protocolDate: todayIsoDate(),
                issuerName: actor.displayName,
                recipient,
                comment: input.comment ?? null,
                createdBy: actor.userId,
            });
            await tx.insert(keyProtocolItemsTable).values(
                chunk.map((line, index) => ({
                    id: crypto.randomUUID(),
                    protocolId,
                    position: index + 1,
                    ...line,
                })),
            );
            created.push({ id: protocolId, protocolNumber });
        }

        // Lost keys leave the stock, if the stock is known.
        if (input.protocolType === 'lost') {
            for (const line of lines) {
                if (line.keyTypeId !== null) {
                    await adjustTotalQuantity(tx, line.keyTypeId, -line.quantity);
                }
            }
        }

        return created;
    });
};

// ---
// Cancelling
// ---

/**
 * Cancels a protocol. An issuance only if no return refers to it anymore.
 * This function is triggered by the /api/key/protocols/[id]/cancel endpoint.
 */
export const cancelProtocol = async (
    protocolId: string,
    kind: KeyDeletionKind,
    reason: string,
    actor: ProtocolActor,
): Promise<KeyProtocolEntry> => {
    return db.transaction(async (tx) => {
        const [protocol] = await tx.select().from(keyProtocolsTable).where(eq(keyProtocolsTable.id, protocolId)).limit(1);
        if (protocol === undefined) {
            throw new KeyActionError('Das Protokoll gibt es nicht.', 404);
        }
        if (protocol.deletedAt !== null) {
            throw new KeyActionError(
                `Das Protokoll ist bereits als ${KEY_DELETION_KIND_LABELS[toKeyDeletionKind(protocol.deletionKind)].toLowerCase()} markiert.`,
                409,
            );
        }

        if (protocol.protocolType === 'issuance') {
            const followUps = await tx
                .selectDistinct({ protocolNumber: keyProtocolsTable.protocolNumber })
                .from(keyProtocolItemsTable)
                .innerJoin(keyProtocolsTable, eq(keyProtocolItemsTable.protocolId, keyProtocolsTable.id))
                .where(and(eq(keyProtocolItemsTable.issuanceProtocolId, protocolId), isNull(keyProtocolsTable.deletedAt)));
            if (followUps.length > 0) {
                const numbers = followUps.map((row) => row.protocolNumber).join(', ');
                throw new KeyActionError(
                    `Auf diese Ausgabe beziehen sich noch Protokolle (${numbers}). Markiere zuerst diese als ungültig.`,
                    409,
                );
            }
        }

        if (protocol.protocolType === 'lost') {
            const items = await tx.select().from(keyProtocolItemsTable).where(eq(keyProtocolItemsTable.protocolId, protocolId));
            for (const item of items) {
                if (item.keyTypeId !== null) {
                    await adjustTotalQuantity(tx, item.keyTypeId, item.quantity);
                }
            }
        }

        const [updated] = await tx
            .update(keyProtocolsTable)
            .set({ deletedAt: new Date(), deletedBy: actor.userId, deletionKind: kind, deletionReason: reason })
            .where(eq(keyProtocolsTable.id, protocolId))
            .returning();
        if (updated === undefined) {
            throw new Error('Cancelling the protocol failed');
        }
        return updated;
    });
};

// ---
// Reading protocols
// ---

export interface KeyProtocolListEntry {
    id: string;
    protocolNumber: string;
    protocolType: KeyProtocolType;
    protocolDate: string | null;
    userProfileId: string;
    recipientName: string;
    profileKind: KeyProfileKind;
    isCancelled: boolean;
    deletionKind: KeyDeletionKind | null;
    hasScan: boolean;
    summary: string;
}

const describeLine = (line: { lineType: string; keyNr: number | null; quantity: number; transponderSerial: string | null }): string => {
    if (line.lineType === 'transponder') {
        return line.transponderSerial ?? 'Transponder';
    }
    const keyNr = line.keyNr === null ? '?' : formatKeyNr(line.keyNr);
    return line.quantity === 1 ? keyNr : `${line.quantity}× ${keyNr}`;
};

export const listProtocols = async (
    filter: { userProfileId?: string; keyTypeId?: string; withoutScan?: boolean; limit?: number } = {},
): Promise<Array<KeyProtocolListEntry>> => {
    const conditions = [];
    if (filter.userProfileId !== undefined) {
        conditions.push(eq(keyProtocolsTable.userProfileId, filter.userProfileId));
    }

    if (filter.keyTypeId !== undefined) {
        const withKeyType = db
            .select({ protocolId: keyProtocolItemsTable.protocolId })
            .from(keyProtocolItemsTable)
            .where(eq(keyProtocolItemsTable.keyTypeId, filter.keyTypeId));
        conditions.push(inArray(keyProtocolsTable.id, withKeyType));
    }

    // Valid receipts of persons that still lack a signed scan.
    if (filter.withoutScan === true) {
        const withScan = db.select({ protocolId: keyProtocolFilesTable.protocolId }).from(keyProtocolFilesTable);
        conditions.push(
            notInArray(keyProtocolsTable.id, withScan),
            isNull(keyProtocolsTable.deletedAt),
            eq(userProfilesTable.profileKind, 'person'),
        );
    }

    const query = db
        .select({ protocol: keyProtocolsTable, profileKind: userProfilesTable.profileKind })
        .from(keyProtocolsTable)
        .innerJoin(userProfilesTable, eq(keyProtocolsTable.userProfileId, userProfilesTable.id))
        .where(and(...conditions))
        .orderBy(desc(keyProtocolsTable.protocolNumber));
    const rows = filter.limit === undefined ? await query : await query.limit(filter.limit);
    if (rows.length === 0) {
        return [];
    }

    const items = await db
        .select({
            protocolId: keyProtocolItemsTable.protocolId,
            lineType: keyProtocolItemsTable.lineType,
            keyNr: keysBaseTable.keyNr,
            quantity: keyProtocolItemsTable.quantity,
            transponderSerial: keyProtocolItemsTable.transponderSerial,
        })
        .from(keyProtocolItemsTable)
        .leftJoin(keysBaseTable, eq(keyProtocolItemsTable.keyTypeId, keysBaseTable.id))
        .where(
            inArray(
                keyProtocolItemsTable.protocolId,
                rows.map((row) => row.protocol.id),
            ),
        )
        .orderBy(asc(keyProtocolItemsTable.position));

    const scanned = new Set(
        (
            await db
                .selectDistinct({ protocolId: keyProtocolFilesTable.protocolId })
                .from(keyProtocolFilesTable)
                .where(
                    inArray(
                        keyProtocolFilesTable.protocolId,
                        rows.map((row) => row.protocol.id),
                    ),
                )
        ).map((row) => row.protocolId),
    );

    const summaries = new Map<string, Array<string>>();
    for (const item of items) {
        const list = summaries.get(item.protocolId) ?? [];
        list.push(describeLine(item));
        summaries.set(item.protocolId, list);
    }

    return rows.map(({ protocol, profileKind }) => ({
        id: protocol.id,
        protocolNumber: protocol.protocolNumber,
        protocolType: toKeyProtocolType(protocol.protocolType),
        protocolDate: protocol.protocolDate,
        userProfileId: protocol.userProfileId,
        recipientName: protocol.recipient.name,
        profileKind: toKeyProfileKind(profileKind),
        isCancelled: protocol.deletedAt !== null,
        deletionKind: protocol.deletedAt === null ? null : toKeyDeletionKind(protocol.deletionKind),
        summary: (summaries.get(protocol.id) ?? []).join(', '),
        hasScan: scanned.has(protocol.id),
    }));
};

// Valid receipts of persons that still lack a signed scan.
export const countProtocolsWithoutScan = async (): Promise<number> => {
    const withScan = db.select({ protocolId: keyProtocolFilesTable.protocolId }).from(keyProtocolFilesTable);
    const [row] = await db
        .select({ value: count() })
        .from(keyProtocolsTable)
        .innerJoin(userProfilesTable, eq(keyProtocolsTable.userProfileId, userProfilesTable.id))
        .where(
            and(
                isNull(keyProtocolsTable.deletedAt),
                eq(userProfilesTable.profileKind, 'person'),
                notInArray(keyProtocolsTable.id, withScan),
            ),
        );
    return row?.value ?? 0;
};

export interface ProtocolDetailItem {
    position: number;
    lineType: KeyLineType;
    keyTypeId: string | null;
    keyNr: number | null;
    quantity: number;
    transponderSerial: string | null;
    description: string;
    issuanceProtocolId: string | null;
    issuanceProtocolNumber: string | null;
}

export interface ProtocolDetails {
    protocol: KeyProtocolEntry;
    protocolType: KeyProtocolType;
    profileKind: KeyProfileKind;
    items: Array<ProtocolDetailItem>;
    // Returns and losses that refer to this issuance
    followUps: Array<{ id: string; protocolNumber: string; protocolType: KeyProtocolType }>;
}

const issuanceProtocols = alias(keyProtocolsTable, 'issuance_protocols');

export const getProtocolDetails = async (protocolId: string): Promise<ProtocolDetails | null> => {
    const [row] = await db
        .select({ protocol: keyProtocolsTable, profileKind: userProfilesTable.profileKind })
        .from(keyProtocolsTable)
        .innerJoin(userProfilesTable, eq(keyProtocolsTable.userProfileId, userProfilesTable.id))
        .where(eq(keyProtocolsTable.id, protocolId))
        .limit(1);
    if (row === undefined) {
        return null;
    }

    const items = await db
        .select({
            position: keyProtocolItemsTable.position,
            lineType: keyProtocolItemsTable.lineType,
            keyTypeId: keyProtocolItemsTable.keyTypeId,
            keyNr: keysBaseTable.keyNr,
            quantity: keyProtocolItemsTable.quantity,
            transponderSerial: keyProtocolItemsTable.transponderSerial,
            description: keyProtocolItemsTable.description,
            issuanceProtocolId: keyProtocolItemsTable.issuanceProtocolId,
            issuanceProtocolNumber: issuanceProtocols.protocolNumber,
        })
        .from(keyProtocolItemsTable)
        .leftJoin(keysBaseTable, eq(keyProtocolItemsTable.keyTypeId, keysBaseTable.id))
        .leftJoin(issuanceProtocols, eq(keyProtocolItemsTable.issuanceProtocolId, issuanceProtocols.id))
        .where(eq(keyProtocolItemsTable.protocolId, protocolId))
        .orderBy(asc(keyProtocolItemsTable.position));

    const followUps = await db
        .selectDistinct({
            id: keyProtocolsTable.id,
            protocolNumber: keyProtocolsTable.protocolNumber,
            protocolType: keyProtocolsTable.protocolType,
        })
        .from(keyProtocolItemsTable)
        .innerJoin(keyProtocolsTable, eq(keyProtocolItemsTable.protocolId, keyProtocolsTable.id))
        .where(and(eq(keyProtocolItemsTable.issuanceProtocolId, protocolId), isNull(keyProtocolsTable.deletedAt)))
        .orderBy(asc(keyProtocolsTable.protocolNumber));

    return {
        protocol: row.protocol,
        protocolType: toKeyProtocolType(row.protocol.protocolType),
        profileKind: toKeyProfileKind(row.profileKind),
        items: items.map((item) => ({
            ...item,
            lineType: item.lineType === 'transponder' ? 'transponder' : 'key',
            description: item.description ?? '',
        })),
        followUps: followUps.map((followUp) => ({ ...followUp, protocolType: toKeyProtocolType(followUp.protocolType) })),
    };
};

export const describeProtocolForLog = (protocols: Array<CreatedProtocol>, protocolType: KeyProtocolType, recipientName: string): string =>
    `${KEY_PROTOCOL_TYPE_LABELS[protocolType]} ${protocols.map((protocol) => protocol.protocolNumber).join(', ')} für ${recipientName}`;
