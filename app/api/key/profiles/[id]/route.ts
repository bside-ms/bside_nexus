import { NextResponse } from 'next/server';
import { deleteKeyProfile, updateKeyProfile } from '@/lib/db/keyActions';
import { formatProfileName } from '@/lib/key/constants';
import { errorResponse, guardKeyRoute, readJson, validationErrorResponse, writeKeyLog } from '@/lib/key/routeHelpers';
import { keyProfileSchema, parseOrError } from '@/lib/validation/keySchemas';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, ctx: RouteContext): Promise<NextResponse> {
    const guard = await guardKeyRoute();
    if (guard instanceof NextResponse) {
        return guard;
    }

    const parsed = parseOrError(keyProfileSchema, await readJson(req));
    if (!parsed.ok) {
        return validationErrorResponse(parsed.error);
    }

    try {
        const { id } = await ctx.params;
        const profile = await updateKeyProfile(id, parsed.data);
        await writeKeyLog(req, guard, 'key.profile.update', `Profil ${formatProfileName(profile)} geändert`, profile.userId);
        return NextResponse.json({ success: true, id: profile.id });
    } catch (error) {
        return errorResponse(error, 'Das Profil konnte nicht gespeichert werden.');
    }
}

export async function DELETE(req: Request, ctx: RouteContext): Promise<NextResponse> {
    const guard = await guardKeyRoute();
    if (guard instanceof NextResponse) {
        return guard;
    }

    try {
        const { id } = await ctx.params;
        const profile = await deleteKeyProfile(id);
        await writeKeyLog(req, guard, 'key.profile.delete', `Profil ${formatProfileName(profile)} gelöscht`, profile.userId);
        return NextResponse.json({ success: true });
    } catch (error) {
        return errorResponse(error, 'Das Profil konnte nicht gelöscht werden.');
    }
}
