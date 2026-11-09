import { NextResponse } from 'next/server';
import { deleteKeyType, updateKeyType } from '@/lib/db/keyActions';
import { formatKeyNr } from '@/lib/key/constants';
import { errorResponse, guardKeyRoute, readJson, validationErrorResponse, writeKeyLog } from '@/lib/key/routeHelpers';
import { keyTypeSchema, parseOrError } from '@/lib/validation/keySchemas';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, ctx: RouteContext): Promise<NextResponse> {
    const guard = await guardKeyRoute();
    if (guard instanceof NextResponse) {
        return guard;
    }

    const parsed = parseOrError(keyTypeSchema, await readJson(req));
    if (!parsed.ok) {
        return validationErrorResponse(parsed.error);
    }

    try {
        const { id } = await ctx.params;
        const keyType = await updateKeyType(id, parsed.data);
        await writeKeyLog(
            req,
            guard,
            'key.type.update',
            `Schließung ${formatKeyNr(keyType.keyNr)} (${keyType.keyDescription}) geändert, Bestand ${keyType.totalQuantity ?? 'unbekannt'}`,
        );
        return NextResponse.json({ success: true, id: keyType.id });
    } catch (error) {
        return errorResponse(error, 'Die Schließung konnte nicht gespeichert werden.');
    }
}

export async function DELETE(req: Request, ctx: RouteContext): Promise<NextResponse> {
    const guard = await guardKeyRoute();
    if (guard instanceof NextResponse) {
        return guard;
    }

    try {
        const { id } = await ctx.params;
        const keyType = await deleteKeyType(id);
        await writeKeyLog(req, guard, 'key.type.delete', `Schließung ${formatKeyNr(keyType.keyNr)} (${keyType.keyDescription}) gelöscht`);
        return NextResponse.json({ success: true });
    } catch (error) {
        return errorResponse(error, 'Die Schließung konnte nicht gelöscht werden.');
    }
}
