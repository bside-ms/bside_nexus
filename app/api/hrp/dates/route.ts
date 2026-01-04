import { type NextRequest, NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { getDatesWithHrpEntries } from '@/lib/db/hrpActions';

export async function POST(req: NextRequest): Promise<NextResponse> {
    const session = await getUserSession();
    const { year, month }: { year: number; month: number } = await req.json();

    if (!session) {
        return NextResponse.json({
            success: false,
            messsage: 'Für diese Aktion musst du eingeloggt sein.',
        });
    }

    const isAllowedRole = session?.roles?.includes('arbeitszeiterfassung') ?? false;
    if (!isAllowedRole) {
        return NextResponse.json({
            success: false,
            messsage: 'Dir fehlen die notwendigen Berechtigungen.',
        });
    }

    const result = await getDatesWithHrpEntries(session.id, year, month);
    return NextResponse.json({ success: true, dates: result }, { status: 200 });
}
