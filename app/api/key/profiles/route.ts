import { NextResponse } from 'next/server';
import { createKeyProfile } from '@/lib/db/keyActions';
import { formatProfileName } from '@/lib/key/constants';
import { errorResponse, guardKeyRoute, readJson, validationErrorResponse, writeKeyLog } from '@/lib/key/routeHelpers';
import { keyProfileSchema, parseOrError } from '@/lib/validation/keySchemas';

export async function POST(req: Request): Promise<NextResponse> {
    const guard = await guardKeyRoute();
    if (guard instanceof NextResponse) {
        return guard;
    }

    const parsed = parseOrError(keyProfileSchema, await readJson(req));
    if (!parsed.ok) {
        return validationErrorResponse(parsed.error);
    }

    try {
        const profile = await createKeyProfile(parsed.data, guard.userId);
        await writeKeyLog(req, guard, 'key.profile.create', `Profil ${formatProfileName(profile)} angelegt`, profile.userId);
        return NextResponse.json({ success: true, id: profile.id }, { status: 201 });
    } catch (error) {
        return errorResponse(error, 'Das Profil konnte nicht angelegt werden.');
    }
}
