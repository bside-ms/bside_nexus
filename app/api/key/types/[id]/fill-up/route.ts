import { type NextRequest, NextResponse } from 'next/server';
import requireRole from '@/lib/auth/requireRole';
import { createKeyItem, fillUpKeyItems } from '@/lib/db/keyActions';
import { fillUpSchema, parseOrError } from '@/lib/validation/keySchemas';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    try {
        const { id: keyTypeId } = await ctx.params;
        const body = await req.json();
        const parsed = parseOrError(fillUpSchema, body);
        if (!parsed.ok) {
            return NextResponse.json(parsed.error, { status: 400 });
        }

        const missingSeq = await fillUpKeyItems(keyTypeId, parsed.data.targetQuantity);
        const created: Array<{ id: string; seqNumber: number }> = [];
        for (const seqNumber of missingSeq) {
            const itemId = crypto.randomUUID();
            await createKeyItem({ id: itemId, keyTypeId, seqNumber });
            created.push({ id: itemId, seqNumber });
        }
        return NextResponse.json({ created });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler beim Auffüllen' }, { status: 400 });
    }
}
