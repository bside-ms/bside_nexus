import { NextResponse } from 'next/server';
import { updateAllHolidayStatuses } from '@/lib/db/hrpAdminActions';

export async function POST(): Promise<NextResponse> {
    try {
        await updateAllHolidayStatuses();
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, error: 'Fehler beim Aktualisieren' }, { status: 500 });
    }
}
