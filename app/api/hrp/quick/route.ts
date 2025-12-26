import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { getHrpEntriesForDate, writeHrpEntry } from '@/lib/db/hrpActions';
import { validateBreaks } from '@/lib/hrp/hrpLogic';
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
    const { event, timestamp, force }: { event: string; timestamp: string; force?: boolean } = body;

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

    // Pausenzeitenvalidierung.
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
