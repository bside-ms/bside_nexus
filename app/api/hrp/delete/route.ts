import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { hrpEventLogTable } from '@/db/schema';
import getUserSession from '@/lib/auth/getUserSession';
import { deleteHrpEntry } from '@/lib/db/hrpActions';

export async function POST(req: NextRequest): Promise<NextResponse> {
    const session = await getUserSession();
    const isAllowedRole = session?.roles?.includes('arbeitszeiterfassung') ?? false;
    if (!session || !isAllowedRole) {
        return NextResponse.json({ success: false, message: 'Nicht eingeloggt' }, { status: 401 });
    }

    const { id, reason } = await req.json();

    if (!id || !reason) {
        return NextResponse.json({ success: false, message: 'ID und Begründung erforderlich' }, { status: 400 });
    }

    // Prüfen ob der Eintrag existiert und ob der User berechtigt ist
    const entries = await db.select().from(hrpEventLogTable).where(eq(hrpEventLogTable.id, id)).limit(1);

    const entry = entries[0];

    if (!entry) {
        return NextResponse.json({ success: false, message: 'Eintrag nicht gefunden' }, { status: 404 });
    }

    const isAdmin = session.roles?.includes('arbeitszeiterfassung-admin');
    const isOwner = entry.userId === session.id;

    if (!isAdmin && !isOwner) {
        return NextResponse.json({ success: false, message: 'Keine Berechtigung' }, { status: 403 });
    }

    if (entry.abgerechnet) {
        return NextResponse.json({ success: false, message: 'Abgerechnete Einträge können nicht gelöscht werden' }, { status: 400 });
    }

    try {
        await deleteHrpEntry({ id, deletedBy: session.id, reason });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, message: 'Fehler beim Löschen' }, { status: 500 });
    }
}
