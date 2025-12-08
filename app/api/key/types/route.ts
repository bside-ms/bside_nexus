import { type NextRequest, NextResponse } from 'next/server';
import requireRole from '@/lib/auth/requireRole';
import { createKeyType, listKeyTypes } from '@/lib/db/keyActions';
import { keyTypeCreateSchema, parseOrError } from '@/lib/validation/keySchemas';

export async function GET() {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const rows = await listKeyTypes();
    return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    try {
        const body = await req.json();
        const parsed = parseOrError(keyTypeCreateSchema, body);
        if (!parsed.ok) {
            return NextResponse.json(parsed.error, { status: 400 });
        }
        const row = await createKeyType({
            id: crypto.randomUUID(),
            keyNr: parsed.data.keyNr,
            keyDescription: parsed.data.keyDescription,
            createdBy: guard.userId ?? null,
        });
        return NextResponse.json(row, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler beim Anlegen' }, { status: 400 });
    }
}
