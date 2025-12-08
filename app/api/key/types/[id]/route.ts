import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { keysBaseTable } from '@/db/schema';
import requireRole from '@/lib/auth/requireRole';
import { softDeleteKeyType, updateKeyType } from '@/lib/db/keyActions';
import { keyTypeUpdateSchema, parseOrError } from '@/lib/validation/keySchemas';

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id } = await ctx.params;
    const rows = await db.select().from(keysBaseTable).where(eq(keysBaseTable.id, id));
    if (rows.length === 0) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    try {
        const body = await req.json();
        const parsed = parseOrError(keyTypeUpdateSchema, body);
        if (!parsed.ok) {
            return NextResponse.json(parsed.error, { status: 400 });
        }
        const { id } = await ctx.params;
        const row = await updateKeyType(id, parsed.data);
        return NextResponse.json(row);
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler beim Aktualisieren' }, { status: 400 });
    }
}

export async function DELETE(_: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    try {
        const { id } = await ctx.params;
        const row = await softDeleteKeyType(id);
        return NextResponse.json(row);
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler beim Löschen' }, { status: 400 });
    }
}
