import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { AccountChangeError, keycloakChangeDisplayname } from '@/lib/keycloak/accountActions';
import { changeMattermostDisplayname } from '@/lib/mattermost/accountActions';

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

        const { newDisplayname }: { newDisplayname: string } = await req.json();

        if (!newDisplayname || newDisplayname.trim().length < 3) {
            return NextResponse.json({ error: 'Dein Anzeigename muss mindestens 3 Zeichen lang sein.' }, { status: 400 });
        }

        await keycloakChangeDisplayname(userId, newDisplayname);
        await changeMattermostDisplayname(user.username, newDisplayname);
        // ToDo: Change displayname in database.
        // ToDo: Log the displayname change.

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        if (error instanceof AccountChangeError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        // Do not pass other messages on, they can contain internals from Keycloak or Mattermost.
        // eslint-disable-next-line no-console
        console.error('[api/account/change-displayname]', error);
        return NextResponse.json({ error: 'Dein Anzeigename wurde nicht geändert.' }, { status: 500 });
    }
}
