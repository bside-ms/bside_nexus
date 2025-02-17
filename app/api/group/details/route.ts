import { isEmpty } from 'lodash-es';
import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { updateGroupDescription } from '@/lib/db/groupActions';

export async function POST(req: Request): Promise<NextResponse> {
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
        return updateGroupDescription(groupId, userId, newDescription, newWikiLink, newWebsiteLink);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Die Gruppendetails konnten nicht aktualisiert werden.' }, { status: 500 });
    }
}
