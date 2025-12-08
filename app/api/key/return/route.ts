import { type NextRequest, NextResponse } from 'next/server';
import requireRole from '@/lib/auth/requireRole';
import { returnKeys } from '@/lib/db/keyActions';
import { parseOrError, returnSchema } from '@/lib/validation/keySchemas';

export async function POST(req: NextRequest) {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    try {
        const body = await req.json();
        const parsed = parseOrError(returnSchema, body);
        if (!parsed.ok) {
            return NextResponse.json(parsed.error, { status: 400 });
        }
        const protocolIds = await returnKeys(parsed.data.assignmentIds, guard.userId ?? undefined);
        return NextResponse.json({ protocolIds }, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler bei der Rückgabe' }, { status: 400 });
    }
}
