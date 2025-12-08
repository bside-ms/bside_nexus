import { NextResponse, type NextRequest } from 'next/server';
import requireRole from '@/lib/auth/requireRole';
import { changeKeyItemStatus } from '@/lib/db/keyActions';
import { changeStatusSchema, parseOrError } from '@/lib/validation/keySchemas';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    try {
        const body = await req.json();
        const parsed = parseOrError(changeStatusSchema, body);
        if (!parsed.ok) return NextResponse.json(parsed.error, { status: 400 });
        const row = await changeKeyItemStatus(params.id, parsed.data.status);
        return NextResponse.json(row);
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler beim Statuswechsel' }, { status: 400 });
    }
}
