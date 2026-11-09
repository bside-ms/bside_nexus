import { NextResponse } from 'next/server';
import { verifyProtocol } from '@/lib/db/keyProtocolActions';
import { KEY_PROTOCOL_TYPE_LABELS, toKeyProtocolType } from '@/lib/key/constants';
import { errorResponse, guardKeyRoute, writeKeyLog } from '@/lib/key/routeHelpers';

interface RouteContext {
    params: Promise<{ id: string }>;
}

// Removes the "uncertain" mark after someone checked the protocol.
export async function POST(req: Request, ctx: RouteContext): Promise<NextResponse> {
    const guard = await guardKeyRoute();
    if (guard instanceof NextResponse) {
        return guard;
    }

    try {
        const { id } = await ctx.params;
        const protocol = await verifyProtocol(id);
        const typeLabel = KEY_PROTOCOL_TYPE_LABELS[toKeyProtocolType(protocol.protocolType)];
        await writeKeyLog(
            req,
            guard,
            'key.protocol.verify',
            `${typeLabel} ${protocol.protocolNumber} für ${protocol.recipient.name} als geprüft markiert`,
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        return errorResponse(error, 'Das Protokoll konnte nicht als geprüft markiert werden.');
    }
}
