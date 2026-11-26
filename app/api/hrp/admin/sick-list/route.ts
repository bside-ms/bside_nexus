import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { HRP_ADMIN_ROLE } from '@/lib/hrp/adminAccess';
import { toBerlinDateString } from '@/lib/hrp/hrpLogic';
import { buildSickListCsv, getSickListFileName, loadSickList, parseSickListQuery } from '@/lib/hrp/sickList';

export async function GET(req: NextRequest): Promise<NextResponse> {
    const session = await getUserSession();
    if (session === null) {
        return NextResponse.json({ success: false, message: 'Nicht angemeldet.' }, { status: 401 });
    }
    if (!(session.roles?.includes(HRP_ADMIN_ROLE) ?? false)) {
        return NextResponse.json({ success: false, message: 'Du darfst die Krankheitsliste nicht abrufen.' }, { status: 403 });
    }

    const query = parseSickListQuery((key) => req.nextUrl.searchParams.get(key) ?? undefined, toBerlinDateString(new Date()));

    try {
        const list = await loadSickList(session.id, query);
        if (list.groups.length === 0) {
            return NextResponse.json({ success: false, message: 'Du verwaltest keine Verträge.' }, { status: 403 });
        }

        return new NextResponse(buildSickListCsv(list), {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${getSickListFileName(query)}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch {
        return NextResponse.json(
            { success: false, message: 'Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.' },
            { status: 500 },
        );
    }
}
