import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { createContract, getActiveContractsForUser } from '@/lib/db/contractActions';
import { isGlobalAdmin } from '@/lib/db/groupActions';
import { contractCreateSchema } from '@/lib/validation/hrpSchemas';
import { parseOrError } from '@/lib/validation/keySchemas';

export async function GET(): Promise<NextResponse> {
    const session = await getUserSession();

    if (!session) {
        return NextResponse.json(
            {
                success: false,
                message: 'Für diese Aktion musst du eingeloggt sein.',
            },
            { status: 401 },
        );
    }

    const isAllowedRole = session?.roles?.includes('arbeitszeiterfassung') ?? false;
    if (!isAllowedRole) {
        return NextResponse.json(
            {
                success: false,
                message: 'Dir fehlen die notwendigen Berechtigungen.',
            },
            { status: 403 },
        );
    }

    const contracts = await getActiveContractsForUser(session.id);
    return NextResponse.json({ success: true, contracts }, { status: 200 });
}

export async function POST(req: Request): Promise<NextResponse> {
    const session = await getUserSession();
    const isAllowedRole = session?.roles?.includes('arbeitszeiterfassung-admin') ?? false;
    if (!session || !isAllowedRole) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Verträge dürfen nur Systemadmins anlegen.
    if (!isGlobalAdmin(session.id)) {
        return NextResponse.json({ message: 'Nur Systemadministrator*innen dürfen Verträge anlegen.' }, { status: 403 });
    }

    const parsed = parseOrError(contractCreateSchema, await req.json());
    if (!parsed.ok) {
        const message = parsed.error.issues?.[0]?.message ?? 'Ungültige Eingaben.';
        return NextResponse.json({ success: false, message, ...parsed.error }, { status: 400 });
    }

    const { hourlyRate, ...values } = parsed.data;

    const id = await createContract({ ...values, hourlyRate: hourlyRate.toFixed(2) });

    return NextResponse.json({ success: true, id }, { status: 201 });
}
