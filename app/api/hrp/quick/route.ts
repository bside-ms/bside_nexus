import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { writeHrpEntry } from '@/lib/db/hrpActions';
import { getClientIP } from '@/lib/utils/getClientIP';

const validEvents = ['start', 'pause', 'pause_end', 'stop'];

export async function POST(req: NextRequest): Promise<NextResponse> {
    const session = await getUserSession();
    if (!session) {
        return NextResponse.json({
            success: false,
            messsage: 'Für diese Aktion musst du eingeloggt sein.',
        });
    }

    // ToDo: Prüfe die Berechtigung für die Zeiterfassung.

    const body = await req.json();
    const { event, timestamp }: { event: string; timestamp: string } = body;

    if (!validEvents.includes(event)) {
        return NextResponse.json({ success: false, message: 'Unbekanntes Ereignis' }, { status: 400 });
    }

    if (!timestamp) {
        return NextResponse.json({ success: false, message: 'Es ist ein Fehler aufgetreten.' }, { status: 400 });
    }

    const time = new Date(timestamp);
    if (isNaN(time.getTime())) {
        return NextResponse.json({ success: false, message: 'Ungültiges Zeitstempel-Format' }, { status: 400 });
    }

    const now = new Date();
    const tolerance = 5 * 60 * 1000;

    if (time > new Date(now.getTime() + tolerance)) {
        return NextResponse.json({ success: false, message: 'Der Zeitstempel liegt in der Zukunft' }, { status: 400 });
    }

    if (time < new Date(now.getTime() - tolerance)) {
        return NextResponse.json({ success: false, message: 'Der Zeitstempel liegt zu weit in der Vergangenheit.' }, { status: 400 });
    }

    // ToDo: Pausenzeitenvalidierung.
    // ToDo: Prüfe ob es eine Start-Event innerhalb der letzten 18 Stunden ohne Stop-Event gibt.

    const ipAddress = getClientIP(req);
    try {
        await writeHrpEntry({
            userId: session.id,
            ipAddress,
            eventType: 'quick',
            entryType: event,
            timestamp: time,
            comment: null,
        });
    } catch {
        return NextResponse.json(
            { success: false, message: 'Fehler beim Speichern des Ereignisses. Bitte versuche es später erneut.' },
            { status: 500 },
        );
    }

    return NextResponse.json({ success: true, received: event });
}
