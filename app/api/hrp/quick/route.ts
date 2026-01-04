import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { hrpContractsTable } from '@/db/schema';
import getUserSession from '@/lib/auth/getUserSession';
import { getHrpEntriesForDate, writeHrpEntry } from '@/lib/db/hrpActions';
import { aggregateDay } from '@/lib/hrp/aggregation';
import { validateBreaks } from '@/lib/hrp/hrpLogic';
import { getClientIP } from '@/lib/utils/getClientIP';

const validEvents = ['start', 'pause', 'pause_end', 'stop'];

export async function POST(req: NextRequest): Promise<NextResponse> {
    const session = await getUserSession();
    const isAllowedRole = session?.roles?.includes('arbeitszeiterfassung') ?? false;
    if (!session || !isAllowedRole) {
        return NextResponse.json({
            success: false,
            messsage: 'Für diese Aktion musst du eingeloggt sein.',
        });
    }

    const body = await req.json();
    const { event, contractId, force }: { event: string; contractId: string; force?: boolean } = body;

    if (!validEvents.includes(event)) {
        return NextResponse.json({ success: false, message: 'Unbekanntes Ereignis' }, { status: 400 });
    }

    if (!contractId) {
        return NextResponse.json({ success: false, message: 'Kein Arbeitsvertrag ausgewählt.' }, { status: 400 });
    }
    const contract = await db.query.hrpContractsTable.findFirst({
        where: eq(hrpContractsTable.id, contractId),
    });
    if (!contract || contract.userId !== session.id) {
        return NextResponse.json({ success: false, message: 'Ungültiger Vertrag.' }, { status: 403 });
    }

    const time = new Date();
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
            contractId,
            eventType: 'quick',
            entryType: event,
            timestamp: time,
            comment: null,
            abgerechnet: false,
        });
    } catch {
        return NextResponse.json(
            { success: false, message: 'Fehler beim Speichern des Ereignisses. Bitte versuche es später erneut.' },
            { status: 500 },
        );
    }

    const dateString = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(now);
    await aggregateDay(session.id, dateString, contractId);

    return NextResponse.json({ success: true, received: event });
}
