import type { SQL } from 'drizzle-orm';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import type { Group, LogEntry, User } from '@/db/schema';
import { logsTable } from '@/db/schema';
import { v4 as uuidv4 } from 'uuid';

type LogFilter = SQL | undefined;

// ---
// WRITING Actions
// ---

export async function writeLogEntry({
    userId,
    ipAddress,
    eventType,
    affectedUserId,
    affectedGroupId,
    description,
}: {
    userId: string;
    ipAddress: string;
    eventType: string;
    affectedUserId: string | null;
    affectedGroupId: string | null;
    description: string;
}): Promise<LogEntry> {
    const id = uuidv4();
    const newLogEntry = {
        id,
        userId,
        ipAddress,
        eventType,
        affectedUserId,
        affectedGroupId,
        description,
    };

    const insertedLogs = await db.insert(logsTable).values(newLogEntry).returning();

    if (insertedLogs.length <= 0 || insertedLogs[0] === undefined) {
        throw new Error('Failed to insert log entry');
    }

    return insertedLogs[0];
}

export async function writeUserLogEntry({
    user,
    userId,
    ipAddress,
    eventType,
    description,
}: {
    user: User;
    userId: string;
    ipAddress: string;
    eventType: string;
    description: string;
}): Promise<LogEntry> {
    return writeLogEntry({
        userId,
        ipAddress,
        eventType,
        affectedUserId: user.id,
        affectedGroupId: null,
        description,
    });
}

export async function writeGroupLogEntry({
    group,
    userId,
    ipAddress,
    eventType,
    description,
}: {
    group: Group;
    userId: string;
    ipAddress: string;
    eventType: string;
    description: string;
}): Promise<LogEntry> {
    return writeLogEntry({
        userId,
        ipAddress,
        eventType,
        affectedUserId: null,
        affectedGroupId: group.id,
        description,
    });
}

//
// READING Actions
//

async function getLogs({
    limit = 20,
    offset = 0,
    filter,
}: {
    limit?: number;
    offset?: number;
    filter?: LogFilter;
}): Promise<Array<LogEntry>> {
    return db.select().from(logsTable).where(filter).orderBy(desc(logsTable.timestamp)).limit(limit).offset(offset);
}

export async function getAllLogs({
    limit = 20,
    offset = 0,
}: {
    limit?: number;
    offset?: number;
} = {}): Promise<Array<LogEntry>> {
    return getLogs({ limit, offset, filter: undefined });
}

export async function getLogsAffectingUser({
    userId,
    limit = 20,
    offset = 0,
}: {
    userId: string;
    limit?: number;
    offset?: number;
}): Promise<Array<LogEntry>> {
    return getLogs({
        limit,
        offset,
        filter: eq(logsTable.affectedUserId, userId),
    });
}

export async function getLogsAffectingGroup({
    groupId,
    limit = 20,
    offset = 0,
}: {
    groupId: string;
    limit?: number;
    offset?: number;
}): Promise<Array<LogEntry>> {
    return getLogs({
        limit,
        offset,
        filter: eq(logsTable.affectedGroupId, groupId),
    });
}

export async function getLogsPerformedByUser({
    userId,
    limit = 20,
    offset = 0,
}: {
    userId: string;
    limit?: number;
    offset?: number;
}): Promise<Array<LogEntry>> {
    return getLogs({
        limit,
        offset,
        filter: eq(logsTable.userId, userId),
    });
}
