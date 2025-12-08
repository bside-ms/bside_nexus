import { type NextRequest, NextResponse } from 'next/server';
import requireRole from '@/lib/auth/requireRole';
import { getProtocolDetails } from '@/lib/db/keyProtocolQueries';

export async function GET(_: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const guard = await requireRole('schluesselverwaltung');
    if (!guard.isAllowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id } = await ctx.params;
    const details = await getProtocolDetails(id);
    if (!details.protocol) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
    return NextResponse.json(details);
}
