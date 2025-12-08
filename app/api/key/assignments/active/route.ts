import { and, eq, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { keyAssignmentTable, keyItemsTable, keysBaseTable, userProfilesTable } from '@/db/schema';
import requireRole from '@/lib/auth/requireRole';

// Liefert alle aktiven Zuweisungen (nicht zurückgegeben, nicht verloren)
export async function GET() {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = await db
        .select({
            assignmentId: keyAssignmentTable.id,
            userProfileId: keyAssignmentTable.userProfileId,
            keyItemId: keyAssignmentTable.keyItemId,
            receivedAt: keyAssignmentTable.receivedAt,
            keyNr: keysBaseTable.keyNr,
            seqNumber: keyItemsTable.seqNumber,
            keyDescription: keysBaseTable.keyDescription,
            profileFirstName: userProfilesTable.firstName,
            profileLastName: userProfilesTable.lastName,
            profileNumber: userProfilesTable.profileNumber,
        })
        .from(keyAssignmentTable)
        .leftJoin(keyItemsTable, eq(keyAssignmentTable.keyItemId, keyItemsTable.id))
        .leftJoin(keysBaseTable, eq(keyItemsTable.keyTypeId, keysBaseTable.id))
        .leftJoin(userProfilesTable, eq(keyAssignmentTable.userProfileId, userProfilesTable.id))
        .where(and(isNull(keyAssignmentTable.returnedAt), isNull(keyAssignmentTable.lostAt)));

    return NextResponse.json(rows);
}
