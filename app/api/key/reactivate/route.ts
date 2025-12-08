import { NextResponse, type NextRequest } from 'next/server';
import requireRole from '@/lib/auth/requireRole';
import { reactivateFoundKeyItem } from '@/lib/db/keyActions';
import { parseOrError, reactivateSchema } from '@/lib/validation/keySchemas';

export async function POST(req: NextRequest) {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    try {
        const body = await req.json();
        const parsed = parseOrError(reactivateSchema, body);
        if (!parsed.ok) return NextResponse.json(parsed.error, { status: 400 });
        const row = await reactivateFoundKeyItem(parsed.data.keyItemId);
        return NextResponse.json(row);
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler bei der Reaktivierung' }, { status: 400 });
    }
}
