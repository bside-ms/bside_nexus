import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import type { KeyProtocolEntry } from '@/db/schema';
import { keyProtocolFilesTable, keyProtocolsTable, usersTable } from '@/db/schema';
import type { ProtocolActor } from '@/lib/db/keyProtocolActions';
import { toKeyProtocolType } from '@/lib/key/constants';
import { KeyActionError } from '@/lib/key/errors';
import { uploadNewFile } from '@/lib/nextcloud/webdav';

export const SCAN_CONTENT_TYPES: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
};

export const SCAN_MAX_BYTES = 20 * 1024 * 1024;

export interface ProtocolScan {
    id: string;
    filePath: string;
    originalName: string | null;
    contentType: string;
    size: number;
    uploadedAt: Date;
    uploadedByName: string | null;
}

// Newest first. The first entry is the current scan.
export const listProtocolScans = async (protocolId: string): Promise<Array<ProtocolScan>> => {
    const rows = await db
        .select({
            id: keyProtocolFilesTable.id,
            filePath: keyProtocolFilesTable.filePath,
            originalName: keyProtocolFilesTable.originalName,
            contentType: keyProtocolFilesTable.contentType,
            size: keyProtocolFilesTable.size,
            uploadedAt: keyProtocolFilesTable.uploadedAt,
            displayName: usersTable.displayName,
            username: usersTable.username,
        })
        .from(keyProtocolFilesTable)
        .leftJoin(usersTable, eq(keyProtocolFilesTable.uploadedBy, usersTable.id))
        .where(eq(keyProtocolFilesTable.protocolId, protocolId))
        .orderBy(desc(keyProtocolFilesTable.uploadedAt));
    return rows.map(({ displayName, username, ...row }) => ({ ...row, uploadedByName: displayName ?? username }));
};

export const getProtocolScan = async (
    protocolId: string,
    fileId: string,
): Promise<{ filePath: string; contentType: string; originalName: string | null } | null> => {
    const [row] = await db
        .select({
            filePath: keyProtocolFilesTable.filePath,
            contentType: keyProtocolFilesTable.contentType,
            originalName: keyProtocolFilesTable.originalName,
        })
        .from(keyProtocolFilesTable)
        .where(and(eq(keyProtocolFilesTable.id, fileId), eq(keyProtocolFilesTable.protocolId, protocolId)))
        .limit(1);
    return row ?? null;
};

export interface AddProtocolScanInput {
    protocolId: string;
    data: ArrayBuffer;
    contentType: string;
    originalName: string | null;
    // Date written on the paper receipt. null = unknown.
    protocolDate: string | null;
}

// Issuances go to "Ausgabe", returns and losses (signed on the return form) to "Rückgabe".
const scanLocation = (protocol: KeyProtocolEntry): { folder: string; baseName: string } => {
    const type = toKeyProtocolType(protocol.protocolType);
    const name = protocol.recipient.name === '' ? 'Unbekannt' : protocol.recipient.name;
    return {
        folder: type === 'issuance' ? 'Ausgabe' : 'Rückgabe',
        baseName: type === 'lost' ? `${protocol.protocolNumber} - ${name} - Verlust` : `${protocol.protocolNumber} - ${name}`,
    };
};

/**
 * Uploads the signed scan to Nextcloud as a new file and sets the protocol date from the paper.
 */
export const addProtocolScan = async (input: AddProtocolScanInput, actor: ProtocolActor): Promise<{ id: string; filePath: string }> => {
    const extension = SCAN_CONTENT_TYPES[input.contentType];
    if (extension === undefined) {
        throw new KeyActionError('Bitte lade ein PDF, JPG oder PNG hoch.');
    }
    if (input.data.byteLength === 0 || input.data.byteLength > SCAN_MAX_BYTES) {
        throw new KeyActionError('Die Datei ist leer oder größer als 20 MB.');
    }

    const [protocol] = await db.select().from(keyProtocolsTable).where(eq(keyProtocolsTable.id, input.protocolId)).limit(1);
    if (protocol === undefined) {
        throw new KeyActionError('Das Protokoll gibt es nicht.', 404);
    }

    // Upload first. If the DB write fails afterwards, the file stays in Nextcloud and can be attached again.
    const { folder, baseName } = scanLocation(protocol);
    const filePath = await uploadNewFile(folder, baseName, extension, input.data, input.contentType);

    const id = crypto.randomUUID();
    await db.transaction(async (tx) => {
        await tx.insert(keyProtocolFilesTable).values({
            id,
            protocolId: protocol.id,
            filePath,
            originalName: input.originalName,
            contentType: input.contentType,
            size: input.data.byteLength,
            uploadedBy: actor.userId,
        });
        await tx.update(keyProtocolsTable).set({ protocolDate: input.protocolDate }).where(eq(keyProtocolsTable.id, protocol.id));
    });
    return { id, filePath };
};
