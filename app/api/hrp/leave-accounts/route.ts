import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { deleteLeaveAccount, upsertLeaveAccount } from '@/lib/db/hrpAdminActions';

export async function POST(req: Request): Promise<NextResponse> {
    const session = await getUserSession();
    const isAllowedRole = session?.roles?.includes('arbeitszeiterfassung-admin') ?? false;
    if (!session || !isAllowedRole) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const result = await upsertLeaveAccount(body);
        return NextResponse.json({ success: true, data: result });
    } catch {
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request): Promise<NextResponse> {
    const session = await getUserSession();
    const isAllowedRole = session?.roles?.includes('arbeitszeiterfassung-admin') ?? false;
    if (!session || !isAllowedRole) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ success: false, message: 'Missing ID' }, { status: 400 });
        }
        await deleteLeaveAccount(id);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
