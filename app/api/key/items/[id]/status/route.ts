import { type NextRequest, NextResponse } from 'next/server';
import requireRole from '@/lib/auth/requireRole';
import { changeKeyItemStatus } from '@/lib/db/keyActions';
import { changeStatusSchema, parseOrError } from '@/lib/validation/keySchemas';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    try {
        const body = await req.json();
        const parsed = parseOrError(changeStatusSchema, body);
        if (!parsed.ok) {
            return NextResponse.json(parsed.error, { status: 400 });
        }
        const { id } = await ctx.params;
        const row = await changeKeyItemStatus(id, parsed.data.status);
        return NextResponse.json(row);
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler beim Statuswechsel' }, { status: 400 });
    }
}
