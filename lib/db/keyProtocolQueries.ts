import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { keyAssignmentTable, keyItemsTable, keyProtocolsTable, keysBaseTable, userProfilesTable } from '@/db/schema';

export interface ProtocolRow {
    id: string;
    protocolType: 'issuance' | 'return';
    userProfileId: string;
    createdAt: Date;
    createdBy: string | null;
}

export interface ProtocolItemRow {
    keyId: string; // key_items.id
    keyNr: number;
    seqNumber: number;
    description: string;
}

export interface ProtocolDetails {
    protocol: ProtocolRow | null;
    profile: typeof userProfilesTable.$inferSelect | null;
    items: Array<ProtocolItemRow>;
}

export const getProtocolDetails = async (protocolId: string): Promise<ProtocolDetails> => {
    const rows = await db.select().from(keyProtocolsTable).where(eq(keyProtocolsTable.id, protocolId)).limit(1);
    const protocol = rows[0] ?? null;
    if (!protocol) {
        return { protocol: null, profile: null, items: [] };
    }

    const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.id, protocol.userProfileId)).limit(1);

    const isIssuance = protocol.protocolType === 'issuance';
    const assignmentJoin = await db
        .select({
            assignmentId: keyAssignmentTable.id,
            keyItemId: keyAssignmentTable.keyItemId,
            seqNumber: keyItemsTable.seqNumber,
            keyTypeId: keyItemsTable.keyTypeId,
            keyNr: keysBaseTable.keyNr,
            keyDescription: keysBaseTable.keyDescription,
        })
        .from(keyAssignmentTable)
        .leftJoin(keyItemsTable, eq(keyAssignmentTable.keyItemId, keyItemsTable.id))
        .leftJoin(keysBaseTable, eq(keyItemsTable.keyTypeId, keysBaseTable.id))
        .where(
            isIssuance
                ? eq(keyAssignmentTable.issuanceProtocolId, protocolId)
                : and(eq(keyAssignmentTable.returnProtocolId, protocolId), eq(keyAssignmentTable.userProfileId, protocol.userProfileId)),
        );

    // ToDo: Fix this.
    // @ts-expect-error asdf
    const items: Array<ProtocolItemRow> = assignmentJoin.map((r) => ({
        keyId: r.keyItemId,
        keyNr: r.keyNr,
        seqNumber: r.seqNumber,
        description: r.keyDescription,
    }));

    return {
        protocol: protocol as ProtocolRow,
        profile: profile ?? null,
        items,
    };
};
