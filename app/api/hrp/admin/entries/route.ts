import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { HrpEventLogEntry } from '@/db/schema';
import getUserSession from '@/lib/auth/getUserSession';
import {
    correctHrpEntryAsAdmin,
    createHrpEntryAsAdmin,
    deleteHrpEntryAsAdmin,
    getActiveHrpEntry,
    previewHrpEntryChange,
} from '@/lib/db/hrpCorrectionActions';
import type { ContractEditorAccess } from '@/lib/hrp/adminAccess';
import { buildAdminActor, getContractEditorAccess, HRP_ADMIN_ROLE, isWithinContract } from '@/lib/hrp/adminAccess';
import { HrpValidationError } from '@/lib/hrp/corrections';
import { adminEntryCorrectSchema, adminEntryCreateSchema, adminEntryDeleteSchema } from '@/lib/validation/hrpSchemas';
import { parseOrError } from '@/lib/validation/keySchemas';

const NOT_ALLOWED = 'Du darfst die Buchungen dieses Vertrags nicht korrigieren.';
const OUTSIDE_CONTRACT = 'Der Zeitpunkt liegt außerhalb der Vertragslaufzeit.';

const isHrpAdmin = async (): Promise<boolean> => (await getUserSession())?.roles?.includes(HRP_ADMIN_ROLE) ?? false;

const errorResponse = (error: unknown): NextResponse =>
    error instanceof HrpValidationError
        ? NextResponse.json({ success: false, message: error.message }, { status: 409 })
        : NextResponse.json(
              { success: false, message: 'Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.' },
              { status: 500 },
          );

const invalidInput = (error: object): NextResponse =>
    NextResponse.json({ success: false, message: 'Ungültige Eingaben.', ...error }, { status: 400 });

/** Lädt die Buchung und prüft die Rechte am Vertrag. */
const loadEditableEntry = async (
    id: string,
): Promise<{ ok: true; entry: HrpEventLogEntry; access: ContractEditorAccess } | { ok: false; response: NextResponse }> => {
    const entry = await getActiveHrpEntry(id);
    if (entry === null) {
        return {
            ok: false,
            response: NextResponse.json({ success: false, message: 'Die Buchung wurde nicht gefunden.' }, { status: 404 }),
        };
    }
    const access = entry.contractId === null ? null : await getContractEditorAccess(entry.contractId);
    if (access === null) {
        return { ok: false, response: NextResponse.json({ success: false, message: NOT_ALLOWED }, { status: 403 }) };
    }
    if (entry.abgerechnet || entry.abgerechnet_date !== null) {
        return {
            ok: false,
            response: NextResponse.json(
                { success: false, message: 'Abgerechnete Buchungen können nicht geändert werden.' },
                { status: 409 },
            ),
        };
    }
    return { ok: true, entry, access };
};

// Buchung anlegen.
export async function POST(req: NextRequest): Promise<NextResponse> {
    if (!(await isHrpAdmin())) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const parsed = parseOrError(adminEntryCreateSchema, await req.json());
    if (!parsed.ok) {
        return invalidInput(parsed.error);
    }
    const { contractId, entryType, reason, dryRun } = parsed.data;
    const timestamp = new Date(parsed.data.timestamp);

    const access = await getContractEditorAccess(contractId);
    if (access === null) {
        return NextResponse.json({ success: false, message: NOT_ALLOWED }, { status: 403 });
    }
    if (!isWithinContract(access.contract, entryType, timestamp)) {
        return NextResponse.json({ success: false, message: OUTSIDE_CONTRACT }, { status: 400 });
    }

    try {
        const change = { entryType, timestamp };
        if (dryRun === true) {
            const preview = await previewHrpEntryChange({ userId: access.contract.userId, contractId, add: change });
            return NextResponse.json({ success: true, preview });
        }

        const entry = await createHrpEntryAsAdmin({
            actor: buildAdminActor(access.session, req, reason),
            userId: access.contract.userId,
            contractId,
            change,
        });
        return NextResponse.json({ success: true, entry }, { status: 201 });
    } catch (error) {
        return errorResponse(error);
    }
}

// Buchung korrigieren: soft delete + neue anlegen.
export async function PATCH(req: NextRequest): Promise<NextResponse> {
    if (!(await isHrpAdmin())) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const parsed = parseOrError(adminEntryCorrectSchema, await req.json());
    if (!parsed.ok) {
        return invalidInput(parsed.error);
    }
    const { id, entryType, reason, dryRun } = parsed.data;
    const timestamp = new Date(parsed.data.timestamp);

    const loaded = await loadEditableEntry(id);
    if (!loaded.ok) {
        return loaded.response;
    }
    const { entry, access } = loaded;

    if (!isWithinContract(access.contract, entryType, timestamp)) {
        return NextResponse.json({ success: false, message: OUTSIDE_CONTRACT }, { status: 400 });
    }
    if (entry.entryType === entryType && entry.loggedTimestamp.getTime() === timestamp.getTime()) {
        return NextResponse.json({ success: false, message: 'Die Buchung ist unverändert.' }, { status: 400 });
    }

    try {
        const change = { entryType, timestamp };
        if (dryRun === true) {
            const preview = await previewHrpEntryChange({
                userId: entry.userId,
                contractId: access.contract.id,
                removeId: entry.id,
                add: change,
            });
            return NextResponse.json({ success: true, preview });
        }

        const corrected = await correctHrpEntryAsAdmin({ actor: buildAdminActor(access.session, req, reason), entry, change });
        return NextResponse.json({ success: true, entry: corrected });
    } catch (error) {
        return errorResponse(error);
    }
}

// soft delete der Buchung.
export async function DELETE(req: NextRequest): Promise<NextResponse> {
    if (!(await isHrpAdmin())) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const parsed = parseOrError(adminEntryDeleteSchema, await req.json());
    if (!parsed.ok) {
        return invalidInput(parsed.error);
    }
    const { id, reason, dryRun } = parsed.data;

    const loaded = await loadEditableEntry(id);
    if (!loaded.ok) {
        return loaded.response;
    }
    const { entry, access } = loaded;

    try {
        if (dryRun === true) {
            const preview = await previewHrpEntryChange({ userId: entry.userId, contractId: access.contract.id, removeId: entry.id });
            return NextResponse.json({ success: true, preview });
        }

        await deleteHrpEntryAsAdmin({ actor: buildAdminActor(access.session, req, reason), entry });
        return NextResponse.json({ success: true });
    } catch (error) {
        return errorResponse(error);
    }
}
