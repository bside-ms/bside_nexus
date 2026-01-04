import { type NextRequest, NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { createAbsence, getAbsences } from '@/lib/db/hrpAbsenceActions';

export async function POST(req: NextRequest): Promise<NextResponse> {
    const session = await getUserSession();
    if (!session || !session.roles?.includes('arbeitszeiterfassung')) {
        return NextResponse.json({ success: false, message: 'Dir fehlen die erforderlichen Berechtigungen.' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { contractId, type, startDate, endDate } = body;

        if (!contractId || !type || !startDate || !endDate) {
            return NextResponse.json(
                { success: false, message: 'Einige benötigte Informationen wurden nicht richtig übermittelt.' },
                { status: 400 },
            );
        }

        if (!['vacation', 'sick'].includes(type)) {
            return NextResponse.json({ success: false, message: 'Dieser Abwesenheitstyp ist nicht erlaubt.' }, { status: 400 });
        }

        const result = await createAbsence(session.id, {
            contractId,
            type: type as 'vacation' | 'sick',
            startDate,
            endDate,
        });

        return NextResponse.json(result);
    } catch {
        return NextResponse.json(
            { success: false, message: 'Es ist ein Fehler aufgetreten und der Eintrag konnte nicht geladen werden.' },
            { status: 500 },
        );
    }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    const session = await getUserSession();
    if (!session || !session.roles?.includes('arbeitszeiterfassung')) {
        return NextResponse.json({ success: false, message: 'Dir fehlen die erforderlichen Berechtigungen.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contractId = searchParams.get('contractId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!contractId || !startDate || !endDate) {
        return NextResponse.json(
            { success: false, message: 'Einige benötigte Informationen wurden nicht richtig übermittelt.' },
            { status: 400 },
        );
    }

    try {
        const absences = await getAbsences(contractId, startDate, endDate);
        return NextResponse.json({ success: true, absences });
    } catch {
        return NextResponse.json(
            { success: false, message: 'Es ist ein Fehler aufgetreten und der Eintrag konnte nicht geladen werden.' },
            { status: 500 },
        );
    }
}
