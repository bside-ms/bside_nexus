import { isEmpty } from 'lodash-es';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { writeHrpEntry } from '@/lib/db/hrpActions';
import { isValidTimestamp } from '@/lib/hrp/hrp';
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
    const { event, timestamp, comment }: { event: string; timestamp: string; comment: string } = body;

    if (!validEvents.includes(event)) {
        return NextResponse.json({ success: false, message: 'Unbekanntes Ereignis' }, { status: 400 });
    }

    if (!isEmpty(comment) && comment.length > 500) {
        return NextResponse.json({ success: false, message: 'Der Kommentar ist zu lang (max. 500 Zeichen)' }, { status: 400 });
    }

    const isValid = isValidTimestamp(timestamp);
    if (!isValid.success) {
        return NextResponse.json({ success: false, message: isValid.message }, { status: 400 });
    }

    // ToDo: Pausenzeitenvalidierung.
    // ToDo: Prüfe ob es eine Start-Event innerhalb der letzten 18 Stunden ohne Stop-Event gibt.

    const ipAddress = getClientIP(req);
    try {
        await writeHrpEntry({
            userId: session.id,
            ipAddress,
            eventType: 'advanced',
            entryType: event,
            timestamp: new Date(timestamp),
            comment: comment || null,
        });
    } catch {
        return NextResponse.json(
            { success: false, message: 'Fehler beim Speichern des Ereignisses. Bitte versuche es später erneut.' },
            { status: 500 },
        );
    }

    return NextResponse.json({ success: true, received: event });
}
