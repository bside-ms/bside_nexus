import { type NextRequest, NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import {
  deleteAbsence,
  deleteAbsenceGroup,
  getPastAbsences,
  getUpcomingVacations,
} from '@/lib/db/hrpAbsenceActions';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getUserSession();
  if (!session || !session.roles?.includes('arbeitszeiterfassung')) {
    return NextResponse.json(
      { message: 'You are not authorized to perform this action.' },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period');

  try {
    if (period === 'past') {
      const past = await getPastAbsences(session.id);
      return NextResponse.json({ success: true, past });
    }

    const upcoming = await getUpcomingVacations(session.id);
    return NextResponse.json({ success: true, upcoming });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to get absences', error },
      { status: 500 },
    );
  }
}


export async function DELETE(req: NextRequest): Promise<NextResponse> {
    const session = await getUserSession();
    if (!session || !session.roles?.includes('arbeitszeiterfassung')) {
        return NextResponse.json({ success: false, message: 'Dir fehlen die erforderlichen Berechtigungen.' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id, ids, reason } = body;

        if (ids && Array.isArray(ids)) {
            await deleteAbsenceGroup(session.id, ids, reason || 'Manuell gelöscht (Gruppe)');
            return NextResponse.json({ success: true, message: 'Die gewählten Einträge wurden gelöscht.' });
        }

        if (id) {
            await deleteAbsence(session.id, id, reason || 'Manuell gelöscht');
            return NextResponse.json({ success: true, message: 'Der gewählte Eintrag wurde gelöscht.' });
        }

        return NextResponse.json({ success: false, message: 'Missing ID' }, { status: 400 });
    } catch {
        return NextResponse.json(
            { success: false, message: 'Es ist ein Fehler aufgetreten und der Eintrag konnte nicht geladen werden.' },
            { status: 500 },
        );
    }
}
