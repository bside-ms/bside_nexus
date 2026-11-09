import { NextResponse } from 'next/server';
import { createKeyType } from '@/lib/db/keyActions';
import { formatKeyNr } from '@/lib/key/constants';
import { errorResponse, guardKeyRoute, readJson, validationErrorResponse, writeKeyLog } from '@/lib/key/routeHelpers';
import { keyTypeSchema, parseOrError } from '@/lib/validation/keySchemas';

export async function POST(req: Request): Promise<NextResponse> {
    const guard = await guardKeyRoute();
    if (guard instanceof NextResponse) {
        return guard;
    }

    const parsed = parseOrError(keyTypeSchema, await readJson(req));
    if (!parsed.ok) {
        return validationErrorResponse(parsed.error);
    }

    try {
        const keyType = await createKeyType(parsed.data, guard.userId);
        await writeKeyLog(
            req,
            guard,
            'key.type.create',
            `Schließung ${formatKeyNr(keyType.keyNr)} (${keyType.keyDescription}) angelegt, Bestand ${keyType.totalQuantity ?? 'unbekannt'}`,
        );
        return NextResponse.json({ success: true, id: keyType.id }, { status: 201 });
    } catch (error) {
        return errorResponse(error, 'Die Schließung konnte nicht angelegt werden.');
    }
}
