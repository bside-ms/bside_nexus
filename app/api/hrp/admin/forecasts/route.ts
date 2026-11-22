import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isGlobalAdmin } from '@/lib/db/groupActions';
import type { ForecastPlanRow } from '@/lib/db/hrpAdminActions';
import { getForecastPlanRows, saveForecastPlan } from '@/lib/db/hrpAdminActions';
import { buildAdminActor, getForecastPlannerSession } from '@/lib/hrp/adminAccess';
import { HrpValidationError } from '@/lib/hrp/corrections';
import { forecastPlanSchema } from '@/lib/validation/hrpSchemas';
import { parseOrError } from '@/lib/validation/keySchemas';

export async function POST(req: NextRequest): Promise<NextResponse> {
    const session = await getForecastPlannerSession();
    if (session === null) {
        return NextResponse.json({ success: false, message: 'Du darfst die Stundenplanung nicht ändern.' }, { status: 403 });
    }

    const parsed = parseOrError(forecastPlanSchema, await req.json());
    if (!parsed.ok) {
        return NextResponse.json({ success: false, message: 'Ungültige Eingaben.', ...parsed.error }, { status: 400 });
    }
    const { year, month, entries } = parsed.data;

    try {
        const rows = new Map((await getForecastPlanRows(year, month)).map((row) => [row.contractId, row]));
        const changes: Array<{ row: ForecastPlanRow; hours: string | null }> = [];

        for (const entry of entries) {
            const row = rows.get(entry.contractId);
            if (row === undefined) {
                return NextResponse.json(
                    { success: false, message: 'Ein Vertrag ist in diesem Zeitraum nicht mehr aktiv. Bitte lade die Seite neu.' },
                    { status: 409 },
                );
            }
            if (row.userId === session.id && !isGlobalAdmin(session.id)) {
                return NextResponse.json({ success: false, message: 'Deine eigenen Stunden darfst du nicht planen.' }, { status: 403 });
            }
            if (row.finalizedHours !== null) {
                return NextResponse.json(
                    { success: false, message: `${row.userName} wurde für diesen Monat bereits abgerechnet.` },
                    { status: 409 },
                );
            }

            const hours = entry.hours === null ? null : entry.hours.toFixed(2);
            if (hours !== row.plannedHours) {
                changes.push({ row, hours });
            }
        }

        if (changes.length > 0) {
            await saveForecastPlan({ year, month, changes, actor: buildAdminActor(session, req, 'Stundenplanung') });
        }
        return NextResponse.json({ success: true, count: changes.length });
    } catch (error) {
        if (error instanceof HrpValidationError) {
            return NextResponse.json({ success: false, message: error.message }, { status: 409 });
        }
        return NextResponse.json(
            { success: false, message: 'Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.' },
            { status: 500 },
        );
    }
}
