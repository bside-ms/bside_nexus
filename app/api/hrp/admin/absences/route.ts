import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { createAbsence, deleteAbsenceGroup, getAbsencesByIds } from '@/lib/db/hrpAbsenceActions';
import { buildAdminActor, getContractEditorAccess, HRP_ADMIN_ROLE } from '@/lib/hrp/adminAccess';
import { HrpValidationError } from '@/lib/hrp/corrections';
import { adminAbsenceCreateSchema, adminAbsenceDeleteSchema } from '@/lib/validation/hrpSchemas';
import { parseOrError } from '@/lib/validation/keySchemas';

const NOT_ALLOWED = 'Du darfst die Abwesenheiten dieses Vertrags nicht ändern.';

const isHrpAdmin = async (): Promise<boolean> => (await getUserSession())?.roles?.includes(HRP_ADMIN_ROLE) ?? false;

const errorResponse = (error: unknown): NextResponse =>
    error instanceof HrpValidationError
        ? NextResponse.json({ success: false, message: error.message }, { status: 409 })
        : NextResponse.json(
              { success: false, message: 'Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.' },
              { status: 500 },
          );

export async function POST(req: NextRequest): Promise<NextResponse> {
    if (!(await isHrpAdmin())) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const parsed = parseOrError(adminAbsenceCreateSchema, await req.json());
    if (!parsed.ok) {
        return NextResponse.json({ success: false, message: 'Ungültige Eingaben.', ...parsed.error }, { status: 400 });
    }
    const { contractId, type, startDate, endDate, reason } = parsed.data;

    const access = await getContractEditorAccess(contractId);
    if (access === null) {
        return NextResponse.json({ success: false, message: NOT_ALLOWED }, { status: 403 });
    }

    try {
        const result = await createAbsence(
            access.contract.userId,
            { contractId, type, startDate, endDate },
            buildAdminActor(access.session, req, reason),
        );
        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
    if (!(await isHrpAdmin())) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const parsed = parseOrError(adminAbsenceDeleteSchema, await req.json());
    if (!parsed.ok) {
        return NextResponse.json({ success: false, message: 'Ungültige Eingaben.', ...parsed.error }, { status: 400 });
    }
    const { ids, reason } = parsed.data;

    // Alle Abwesenheiten müssen korrigierbar sein und zur selben Person gehören.
    const absences = await getAbsencesByIds(ids);
    if (absences.length === 0) {
        return NextResponse.json({ success: false, message: 'Die Abwesenheiten wurden nicht gefunden.' }, { status: 404 });
    }
    const contractIds = [...new Set(absences.map((a) => a.contractId))];
    const accesses = await Promise.all(contractIds.map((contractId) => getContractEditorAccess(contractId)));
    const firstAccess = accesses[0] ?? null;
    if (firstAccess === null || accesses.some((a) => a?.contract.userId !== firstAccess.contract.userId)) {
        return NextResponse.json({ success: false, message: NOT_ALLOWED }, { status: 403 });
    }

    try {
        await deleteAbsenceGroup(firstAccess.contract.userId, ids, reason, buildAdminActor(firstAccess.session, req, reason));
        return NextResponse.json({ success: true });
    } catch (error) {
        return errorResponse(error);
    }
}
