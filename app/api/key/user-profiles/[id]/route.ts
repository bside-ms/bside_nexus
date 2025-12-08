import { type NextRequest, NextResponse } from 'next/server';
import requireRole from '@/lib/auth/requireRole';
import { getUserProfile, softDeleteUserProfile, updateUserProfile } from '@/lib/db/userProfileActions';
import { parseOrError, userProfileUpdateSchema } from '@/lib/validation/keySchemas';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const row = await getUserProfile(params.id);
    if (!row) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
    return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const parsed = parseOrError(userProfileUpdateSchema, body);
        if (!parsed.ok) {
            return NextResponse.json(parsed.error, { status: 400 });
        }
        const row = await updateUserProfile({ id: params.id, ...parsed.data });
        return NextResponse.json(row);
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler beim Aktualisieren' }, { status: 400 });
    }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const row = await softDeleteUserProfile(params.id);
        return NextResponse.json(row);
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Fehler beim Löschen' }, { status: 400 });
    }
}
