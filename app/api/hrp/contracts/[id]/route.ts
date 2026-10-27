import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { changeContract, previewContractChange } from '@/lib/db/contractChangeActions';
import { isGlobalAdmin } from '@/lib/db/groupActions';
import { getContractById, getLeaveAccounts, terminateContract } from '@/lib/db/hrpAdminActions';
import { getClientIP } from '@/lib/utils/getClientIP';
import getSupportEmail from '@/lib/utils/getSupportEmail';
import { contractChangeSchema } from '@/lib/validation/hrpSchemas';
import { parseOrError } from '@/lib/validation/keySchemas';

const getErrorMessage = (): string => {
    const supportEmail = getSupportEmail();

    return `Es ist ein Fehler aufgetreten. Bitte wende dich an ${supportEmail ?? 'die IT'}.`;
};

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
                canEdit: isGlobalAdmin(session.id),
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

    if (!isGlobalAdmin(session.id)) {
        return NextResponse.json({ success: false, message: 'Nur Systemadministrator*innen dürfen Verträge ändern.' }, { status: 403 });
    }

    const { id } = await params;

    try {
        const parsed = parseOrError(contractChangeSchema, await req.json());
        if (!parsed.ok) {
            return NextResponse.json({ success: false, message: 'Ungültige Eingaben.', ...parsed.error }, { status: 400 });
        }

        const { dryRun, effectiveFrom, hourlyRate, ...values } = parsed.data;

        if (dryRun === true) {
            const preview = await previewContractChange(id, values, effectiveFrom);
            return NextResponse.json({ success: true, preview });
        }

        const result = await changeContract(id, { ...values, hourlyRate: hourlyRate.toFixed(2) }, effectiveFrom, {
            userId: session.id,
            ipAddress: getClientIP(req),
        });
        if ('errors' in result) {
            return NextResponse.json({ success: false, message: result.errors.join(' ') }, { status: 400 });
        }

        return NextResponse.json({ success: true, newId: result.newId });
    } catch {
        return NextResponse.json({ success: false, message: getErrorMessage() }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
    const session = await getUserSession();
    const isAllowedRole = session?.roles?.includes('arbeitszeiterfassung-admin') ?? false;
    if (!session || !isAllowedRole) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!isGlobalAdmin(session.id)) {
        return NextResponse.json({ success: false, message: 'Nur Systemadministrator*innen dürfen Verträge beenden.' }, { status: 403 });
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
        return NextResponse.json({ success: false, message: getErrorMessage() }, { status: 500 });
    }
}
