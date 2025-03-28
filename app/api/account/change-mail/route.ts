import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { keycloakChangeMail } from '@/lib/keycloak/accountActions';
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

        const { newEmail }: { newEmail: string } = await req.json();

        if (!newEmail || newEmail.trim().length < 3) {
            return NextResponse.json({ error: 'Mail-Adresse ist ungültig.' }, { status: 400 });
        }

        await keycloakChangeMail(userId, newEmail);
        await invalidateMattermostSession(user.username);
        // ToDo: Change mail in database.
        // ToDo: Log the mail change.

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'eine Mail-Adresse wurde nicht geändert.' },
            { status: 500 },
        );
    }
}
