import { asc, eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { keyItemsTable, keysBaseTable } from '@/db/schema';
import requireRole from '@/lib/auth/requireRole';
import { createKeyItem } from '@/lib/db/keyActions';
import { keyItemCreateSchema, parseOrError } from '@/lib/validation/keySchemas';

export async function GET(req: NextRequest) {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const keyTypeId = searchParams.get('keyTypeId');
    const rows = keyTypeId
        ? await db.select().from(keyItemsTable).where(eq(keyItemsTable.keyTypeId, keyTypeId)).orderBy(asc(keyItemsTable.seqNumber))
        : await db
              .select({
                  id: keyItemsTable.id,
                  keyTypeId: keyItemsTable.keyTypeId,
                  seqNumber: keyItemsTable.seqNumber,
                  status: keyItemsTable.status,
                  comment: keyItemsTable.comment,
                  createdAt: keyItemsTable.createdAt,
              })
              .from(keyItemsTable)
              .leftJoin(keysBaseTable, eq(keyItemsTable.keyTypeId, keysBaseTable.id))
              .orderBy(asc(keysBaseTable.keyNr), asc(keyItemsTable.seqNumber));
    return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    try {
        const body = await req.json();
        const parsed = parseOrError(keyItemCreateSchema, body);
        if (!parsed.ok) {
            return NextResponse.json(parsed.error, { status: 400 });
        }
        const row = await createKeyItem({
            id: crypto.randomUUID(),
            keyTypeId: parsed.data.keyTypeId,
            seqNumber: parsed.data.seqNumber,
            comment: parsed.data.comment ?? null,
        });
        return NextResponse.json(row, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler beim Anlegen' }, { status: 400 });
    }
}
