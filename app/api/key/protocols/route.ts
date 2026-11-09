import { NextResponse } from 'next/server';
import { getKeyProfile } from '@/lib/db/keyActions';
import { createProtocols, describeProtocolForLog } from '@/lib/db/keyProtocolActions';
import { formatProfileName } from '@/lib/key/constants';
import { errorResponse, guardKeyRoute, readJson, validationErrorResponse, writeKeyLog } from '@/lib/key/routeHelpers';
import { parseOrError, protocolCreateSchema } from '@/lib/validation/keySchemas';

// Creates one protocol per 4 lines (issuance, return or loss).
export async function POST(req: Request): Promise<NextResponse> {
    const guard = await guardKeyRoute();
    if (guard instanceof NextResponse) {
        return guard;
    }

    const parsed = parseOrError(protocolCreateSchema, await readJson(req));
    if (!parsed.ok) {
        return validationErrorResponse(parsed.error);
    }

    try {
        const protocols = await createProtocols(parsed.data, guard);
        const profile = await getKeyProfile(parsed.data.userProfileId);
        const recipientName = profile === null ? parsed.data.userProfileId : formatProfileName(profile);
        await writeKeyLog(
            req,
            guard,
            'key.protocol.create',
            describeProtocolForLog(protocols, parsed.data.protocolType, recipientName),
            profile?.userId ?? null,
        );
        return NextResponse.json({ success: true, protocols }, { status: 201 });
    } catch (error) {
        return errorResponse(error, 'Das Protokoll konnte nicht angelegt werden.');
    }
}
