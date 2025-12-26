import { isEmpty } from 'lodash-es';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { getHrpEntriesForDate, writeHrpEntry } from '@/lib/db/hrpActions';
import { isValidTimestamp, validateBreaks } from '@/lib/hrp/hrpLogic';
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

    const body = await req.json();
    const { event, timestamp, comment, force }: { event: string; timestamp: string; comment: string; force?: boolean } = body;

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

    const time = new Date(timestamp);
    const now = new Date();

    // Prüfe die Einhaltung der gesetzlichen Pausenzeiten.
    if (event === 'stop' && !force) {
        const fiveMinutesInMs = 5 * 60 * 1000;
        const isFutureBooking = time.getTime() > now.getTime() + fiveMinutesInMs;

        if (!isFutureBooking) {
            const yesterday = new Date(time);
            yesterday.setDate(yesterday.getDate() - 1);

            const [entriesToday, entriesYesterday] = await Promise.all([
                getHrpEntriesForDate(session.id, time.getFullYear(), time.getMonth(), time.getDate()),
                getHrpEntriesForDate(session.id, yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()),
            ]);

            const existingEntries = [...entriesYesterday, ...entriesToday];

            const validation = validateBreaks(existingEntries, { entryType: event, timestamp: time });
            if (!validation.isValid) {
                return NextResponse.json(
                    {
                        success: false,
                        needsConfirmation: true,
                        message: validation.warning,
                    },
                    { status: 200 },
                );
            }
        }
    }

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
