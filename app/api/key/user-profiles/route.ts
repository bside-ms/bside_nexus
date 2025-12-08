import { type NextRequest, NextResponse } from 'next/server';
import requireRole from '@/lib/auth/requireRole';
import { createUserProfile, listUserProfiles } from '@/lib/db/userProfileActions';
import { parseOrError, userProfileCreateSchema } from '@/lib/validation/keySchemas';

export async function GET(req: NextRequest): Promise<NextResponse> {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const rows = await listUserProfiles(q);
    return NextResponse.json(rows);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const parsed = parseOrError(userProfileCreateSchema, body);
        if (!parsed.ok) {
            return NextResponse.json(parsed.error, { status: 400 });
        }
        const row = await createUserProfile({ ...parsed.data, createdBy: guard.userId ?? undefined });
        return NextResponse.json(row, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler beim Anlegen' }, { status: 400 });
    }
}
