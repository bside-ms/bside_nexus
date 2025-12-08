import { type NextRequest, NextResponse } from 'next/server';
import requireRole from '@/lib/auth/requireRole';
import { markLost } from '@/lib/db/keyActions';
import { lostSchema, parseOrError } from '@/lib/validation/keySchemas';

export async function POST(req: NextRequest): Promise<NextResponse> {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    try {
        const body = await req.json();
        const parsed = parseOrError(lostSchema, body);
        if (!parsed.ok) {
            return NextResponse.json(parsed.error, { status: 400 });
        }
        const row = await markLost(parsed.data.assignmentId);
        return NextResponse.json(row);
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler beim Verlust markieren' }, { status: 400 });
    }
}
