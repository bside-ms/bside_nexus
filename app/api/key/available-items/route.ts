import { and, eq, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { keyAssignmentTable, keyItemsTable, keysBaseTable } from '@/db/schema';
import requireRole from '@/lib/auth/requireRole';

// Liefert alle verfügbaren, nicht zugewiesenen Schlüssel (status=active und keine aktive Zuweisung)
export async function GET() {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = await db
        .select({
            id: keyItemsTable.id,
            keyTypeId: keyItemsTable.keyTypeId,
            seqNumber: keyItemsTable.seqNumber,
            status: keyItemsTable.status,
            keyNr: keysBaseTable.keyNr,
            keyDescription: keysBaseTable.keyDescription,
        })
        .from(keyItemsTable)
        .leftJoin(
            keyAssignmentTable,
            and(
                eq(keyAssignmentTable.keyItemId, keyItemsTable.id),
                isNull(keyAssignmentTable.returnedAt),
                isNull(keyAssignmentTable.lostAt),
            ),
        )
        .leftJoin(keysBaseTable, eq(keyItemsTable.keyTypeId, keysBaseTable.id))
        .where(and(eq(keyItemsTable.status, 'active'), isNull(keyAssignmentTable.id)));

    return NextResponse.json(rows);
}
