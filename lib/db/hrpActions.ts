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
