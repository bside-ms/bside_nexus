import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { keycloakChangeUsername } from '@/lib/keycloak/accountActions';
import { invalidateMattermostSession } from '@/lib/mattermost/accountActions';

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

        const { newUsername }: { newUsername: string } = await req.json();

        if (!newUsername || newUsername.trim().length < 3) {
            return NextResponse.json({ error: 'Benutzer*innen-Name muss mindestens 3 Zeichen lang sein.' }, { status: 400 });
        }

        await keycloakChangeUsername(userId, newUsername);
        await invalidateMattermostSession(user.username);
        // ToDo: Change username in database.
        // ToDo: Log the username change.

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Dein Username wurde nicht geändert.' },
            { status: 500 },
        );
    }
}
