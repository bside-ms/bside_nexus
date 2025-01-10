import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { changeUsername } from '@/lib/keycloak/accountActions';

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
            return NextResponse.json({ error: 'Username must be at least 3 characters long.' }, { status: 400 });
        }

        // Change username in KeyCloak
        await changeUsername(userId, newUsername);
        // ToDo: Change username in Mattermost

        return NextResponse.json({ success: true });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('Error changing username:', error);
        return NextResponse.json({ error: error.message || 'Dein Username wurde geändert.' }, { status: 500 });
    }
}
