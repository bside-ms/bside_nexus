import { isEmpty } from 'lodash-es';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { updateGroupDescription } from '@/lib/groups';
import { getClientIP } from '@/lib/utils/getClientIP';

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const user = await getUserSession();

        if (!user) {
            return NextResponse.json({ error: 'Du bist nicht eingeloggt.' }, { status: 401 });
        }

        const userId = user.id;
        if (!userId) {
            return NextResponse.json({ error: 'Die eingeloggte Benutzer*in konnte nicht identifiziert werden.' }, { status: 400 });
        }

        const {
            groupId,
            description,
            wikiLink,
            websiteLink,
        }: { groupId: string; description?: string; wikiLink?: string; websiteLink?: string } = await req.json();

        const newDescription = isEmpty(description) ? undefined : description;
        const newWikiLink = isEmpty(wikiLink) ? undefined : wikiLink;
        const newWebsiteLink = isEmpty(websiteLink) ? undefined : websiteLink;

        const ipAddress = getClientIP(req);

        return updateGroupDescription(groupId, userId, ipAddress, newDescription, newWikiLink, newWebsiteLink);
    } catch (error: unknown) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Die Gruppendetails konnten nicht aktualisiert werden.',
            },
            { status: 500 },
        );
    }
}
