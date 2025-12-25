import { type NextRequest, NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { getHrpEntriesForDate } from '@/lib/db/hrpActions';

export async function POST(req: NextRequest): Promise<NextResponse> {
    const session = await getUserSession();
    const { year, month, day }: { year: number; month: number; day: number } = await req.json();

    if (!session) {
        return NextResponse.json({
            success: false,
            messsage: 'Für diese Aktion musst du eingeloggt sein.',
        });
    }

    const result = await getHrpEntriesForDate(session.id, year, month, day, true);
    return NextResponse.json({ success: true, entries: result }, { status: 200 });
}
