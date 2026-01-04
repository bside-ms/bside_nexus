import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { getContractById, getLeaveAccounts, terminateContract, updateContract } from '@/lib/db/hrpAdminActions';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
    const session = await getUserSession();
    const isAllowedRole = session?.roles?.includes('arbeitszeiterfassung-admin') ?? false;
    if (!session || !isAllowedRole) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const contract = await getContractById(id);
        if (!contract) {
            return NextResponse.json({ success: false, message: 'Vertrag nicht gefunden' }, { status: 404 });
        }

        const leaveAccounts = await getLeaveAccounts(id);

        return NextResponse.json({
            success: true,
            data: {
                contract,
                leaveAccounts,
            },
        });
    } catch {
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
    const session = await getUserSession();
    const isAllowedRole = session?.roles?.includes('arbeitszeiterfassung-admin') ?? false;
    if (!session || !isAllowedRole) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await req.json();
        const { type, weeklyHours, vacationDaysPerYear, workingDays, changeDate } = body;

        const newId = await updateContract(
            id,
            {
                type,
                weeklyHours,
                vacationDaysPerYear,
                workingDays,
            },
            new Date(changeDate),
        );

        return NextResponse.json({ success: true, newId });
    } catch {
        return NextResponse.json(
            { success: false, message: 'Es ist ein Fehler aufgetreten. Bitte wende dich an it@b-side.ms.' },
            { status: 500 },
        );
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
    const session = await getUserSession();
    const isAllowedRole = session?.roles?.includes('arbeitszeiterfassung-admin') ?? false;
    if (!session || !isAllowedRole) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const { searchParams } = new URL(req.url);
        const terminationDate = searchParams.get('terminationDate');

        if (!terminationDate) {
            return NextResponse.json({ success: false, message: 'Kündigungsdatum fehlt' }, { status: 400 });
        }

        await terminateContract(id, new Date(terminationDate));

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json(
            { success: false, message: 'Es ist ein Fehler aufgetreten. Bitte wende dich an it@b-side.ms.' },
            { status: 500 },
        );
    }
}
