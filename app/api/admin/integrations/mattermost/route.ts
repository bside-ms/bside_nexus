import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { getNexusEnvironment, isProduction, NEXUS_ENVIRONMENT_LABELS } from '@/lib/environment';
import type { MattermostDelivery } from '@/lib/mattermost/messaging';
import { postToChannel, sendDirectMessage } from '@/lib/mattermost/messaging';
import { handleSystemAdminPost } from '@/lib/systemAdminRoute';
import isNotEmptyString from '@/lib/utils/isNotEmptyString';
import { z } from '@/lib/zod';

const schema = z.object({ kind: z.enum(['dm', 'thread']) });

const footer = '_Antworten an diese Nachricht werden nicht gelesen._';

// Uses the same functions as real notifications, so the test mode applies.
export async function POST(req: NextRequest): Promise<NextResponse> {
    return handleSystemAdminPost(
        req,
        schema,
        'api/admin/integrations/mattermost',
        'Die Testnachricht konnte nicht gesendet werden.',
        async ({ kind }) => {
            const user = await getUserSession();
            const username = user?.username ?? '';
            if (!isNotEmptyString(username)) {
                return NextResponse.json({ success: false, error: 'Dein Username ist nicht bekannt.' }, { status: 400 });
            }

            const environment = NEXUS_ENVIRONMENT_LABELS[getNexusEnvironment()];
            const time = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
            const deliveries: Array<MattermostDelivery> = [];

            try {
                if (kind === 'dm') {
                    deliveries.push(
                        await sendDirectMessage(
                            username,
                            `Testnachricht aus Nexus (${environment}), ausgelöst von @${username} am ${time}.\n\n${footer}`,
                        ),
                    );
                } else {
                    // There is no real channel for it.
                    if (isProduction()) {
                        return NextResponse.json(
                            { success: false, error: 'Der Thread-Test ist nur im Testsystem möglich.' },
                            { status: 400 },
                        );
                    }
                    const root = await postToChannel(
                        'thread-test',
                        `Neuer Testantrag A-0000 von @${username}. Erwähnt: @${username}\n\n${footer}`,
                        { channelLabel: '~antraege-test' },
                    );
                    deliveries.push(root);
                    if (root.status !== 'skipped') {
                        deliveries.push(
                            await postToChannel('thread-test', `Status geändert: In Bearbeitung (${time}).`, {
                                rootId: root.postId,
                                channelLabel: '~antraege-test',
                            }),
                        );
                    }
                }
            } catch (error: unknown) {
                // Only system admins see this. The message helps with wrong tokens or channel ids.
                const message = error instanceof Error ? error.message : 'unbekannter Fehler';
                return NextResponse.json({ success: false, error: `Mattermost: ${message}` }, { status: 502 });
            }

            return NextResponse.json({ success: true, deliveries });
        },
    );
}
