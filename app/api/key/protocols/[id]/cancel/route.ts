import { NextResponse } from 'next/server';
import { cancelProtocol } from '@/lib/db/keyProtocolActions';
import { KEY_PROTOCOL_TYPE_LABELS, toKeyProtocolType } from '@/lib/key/constants';
import { errorResponse, guardKeyRoute, readJson, validationErrorResponse, writeKeyLog } from '@/lib/key/routeHelpers';
import { parseOrError, protocolCancelSchema } from '@/lib/validation/keySchemas';

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function POST(req: Request, ctx: RouteContext): Promise<NextResponse> {
    const guard = await guardKeyRoute();
    if (guard instanceof NextResponse) {
        return guard;
    }

    const parsed = parseOrError(protocolCancelSchema, await readJson(req));
    if (!parsed.ok) {
        return validationErrorResponse(parsed.error);
    }

    try {
        const { id } = await ctx.params;
        const protocol = await cancelProtocol(id, parsed.data.reason, guard);
        const typeLabel = KEY_PROTOCOL_TYPE_LABELS[toKeyProtocolType(protocol.protocolType)];
        await writeKeyLog(
            req,
            guard,
            'key.protocol.cancel',
            `${typeLabel} ${protocol.protocolNumber} für ${protocol.recipient.name} storniert: ${parsed.data.reason}`,
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        return errorResponse(error, 'Das Protokoll konnte nicht storniert werden.');
    }
}
