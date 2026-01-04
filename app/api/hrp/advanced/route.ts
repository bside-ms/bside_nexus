import { eq } from 'drizzle-orm';
import { isEmpty } from 'lodash-es';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { hrpContractsTable, hrpEventLogTable } from '@/db/schema';
import getUserSession from '@/lib/auth/getUserSession';
import { getHrpEntriesForDate } from '@/lib/db/hrpActions';
import { aggregateDay } from '@/lib/hrp/aggregation';
import { isValidTimestamp, validateBreaks } from '@/lib/hrp/hrpLogic';
import { canModifyEntry } from '@/lib/hrp/permissions';
import { getClientIP } from '@/lib/utils/getClientIP';
import { v4 as uuidv4 } from 'uuid';

const validEvents = ['start', 'pause', 'pause_end', 'stop'];

export async function POST(req: NextRequest): Promise<NextResponse> {
    const session = await getUserSession();
    const isAllowed = session?.roles?.includes('arbeitszeiterfassung') ?? false;
    if (!session || !isAllowed) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
        event,
        timestamp,
        comment,
        contractId,
        force,
    }: { event: string; timestamp: string; comment: string; contractId: string; force?: boolean } = body;

    if (!contractId) {
        return NextResponse.json({ success: false, message: 'Vertrag nicht ausgewählt.' }, { status: 400 });
    }

    if (!validEvents.includes(event)) {
        return NextResponse.json({ success: false, message: 'Unbekanntes Ereignis' }, { status: 400 });
    }

    if (!isEmpty(comment) && comment.length > 500) {
        return NextResponse.json({ success: false, message: 'Kommentar zu lang' }, { status: 400 });
    }

    const isValid = isValidTimestamp(timestamp);
    if (!isValid.success) {
        return NextResponse.json({ success: false, message: isValid.message }, { status: 400 });
    }

    const time = new Date(timestamp);

    const contract = await db.query.hrpContractsTable.findFirst({
        where: eq(hrpContractsTable.id, contractId),
    });
    if (!contract || contract.userId !== session.id) {
        return NextResponse.json({ success: false, message: 'Ungültiger Vertrag.' }, { status: 403 });
    }
    const permission = canModifyEntry(contract.type, time);
    if (!permission.allowed) {
        return NextResponse.json({ success: false, message: permission.error }, { status: 403 });
    }

    if (event === 'stop' && !force) {
        const now = new Date();
        const fiveMinutesInMs = 5 * 60 * 1000;
        const isFutureBooking = time.getTime() > now.getTime() + fiveMinutesInMs;

        if (!isFutureBooking) {
            const yesterday = new Date(time);
            yesterday.setDate(yesterday.getDate() - 1);

            const [entriesToday, entriesYesterday] = await Promise.all([
                getHrpEntriesForDate(session.id, time.getFullYear(), time.getMonth(), time.getDate(), false, contractId),
                getHrpEntriesForDate(session.id, yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), false, contractId),
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
        await db.insert(hrpEventLogTable).values({
            id: uuidv4(),
            userId: session.id,
            contractId,
            ipAddress: ipAddress || 'unknown',
            eventType: 'advanced',
            entryType: event,
            loggedTimestamp: time,
            comment: comment || null,
            abgerechnet: false,
        });

        // 5. Aggregation triggern
        const dateString = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(time);
        aggregateDay(session.id, dateString, contractId);
    } catch {
        return NextResponse.json({ success: false, message: 'Fahler beim Abspeichern' }, { status: 500 });
    }

    return NextResponse.json({ success: true, received: event });
}
