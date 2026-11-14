import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import { MattermostCheck, NextcloudCheck } from '@/components/admin/IntegrationChecks';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import getUserSession from '@/lib/auth/getUserSession';
import { isGlobalAdmin } from '@/lib/db/groupActions';
import {
    getKeycloakHost,
    getNexusEnvironment,
    isProduction,
    isTestSystemOnProductionKeycloak,
    NEXUS_ENVIRONMENT_LABELS,
} from '@/lib/environment';
import { getMattermostTestChannelId, getMattermostTestUsers } from '@/lib/mattermost/messaging';
import { getNextcloudFolders } from '@/lib/nextcloud/webdav';
import isNotEmptyString from '@/lib/utils/isNotEmptyString';

const breadcrumbs = [
    { title: 'System', url: '/portal/admin/integrations' },
    { title: 'Integrationen', active: true, className: 'block' },
];

export default async function IntegrationsPage(): Promise<ReactElement> {
    const user = await getUserSession();
    if (user === null || !isNotEmptyString(user.id) || !isGlobalAdmin(user.id)) {
        notFound();
    }

    const production = isProduction();
    const nextcloudFolders = getNextcloudFolders();
    const mattermostConfigured = isNotEmptyString(process.env.MATTERMOST_URL) && isNotEmptyString(process.env.MATTERMOST_AUTH_TOKEN);
    const testChannelId = getMattermostTestChannelId();
    const testUsers = getMattermostTestUsers();
    const keycloakHost = getKeycloakHost();
    const onProductionKeycloak = isTestSystemOnProductionKeycloak();

    return (
        <div>
            <NavbarTop items={breadcrumbs} sidebar={true} />
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 lg:p-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Integrationen</h1>
                    <p className="text-muted-foreground">
                        Umgebung von Nexus und Prüfung der Anbindung an Keycloak, Nextcloud und Mattermost.
                    </p>
                </div>

                <Alert className={production ? undefined : 'border-amber-500'}>
                    <AlertTitle className="flex items-center gap-2">
                        Umgebung:{' '}
                        <Badge variant={production ? 'default' : 'secondary'}>{NEXUS_ENVIRONMENT_LABELS[getNexusEnvironment()]}</Badge>
                    </AlertTitle>
                    <AlertDescription>
                        {production
                            ? 'Uploads und Nachrichten gehen an die echten Ordner, Kanäle und Personen.'
                            : 'Testmodus: Uploads landen im _Test-Ordner, Mattermost-Nachrichten im Test-Kanal.'}
                    </AlertDescription>
                </Alert>

                <Card className={onProductionKeycloak ? 'border-red-600' : undefined}>
                    <CardHeader>
                        <CardTitle>Keycloak</CardTitle>
                        <CardDescription>Anmeldung, Gruppen und Rollen. Hier gibt es keinen Testmodus.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                            <dt className="text-muted-foreground">URL</dt>
                            <dd className="font-mono">{keycloakHost ?? 'ungültig oder nicht gesetzt (KEYCLOAK_URL)'}</dd>
                            <dt className="text-muted-foreground">Realm</dt>
                            <dd className="font-mono">{process.env.KEYCLOAK_REALM}</dd>
                        </dl>
                        {onProductionKeycloak && (
                            <p className="text-sm font-medium text-red-600">
                                Dieses Testsystem nutzt das echte Keycloak. Änderungen an Gruppen, Mitgliedschaften, Rollen und Accounts
                                wirken sich auf die echten Accounts aus.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Nextcloud</CardTitle>
                        <CardDescription>Ordner für die unterschriebenen Schlüsselquittungen</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {nextcloudFolders === null ? (
                            <p className="text-sm">
                                Nicht konfiguriert (NEXTCLOUD_URL, NEXTCLOUD_USER, NEXTCLOUD_APP_PASSWORD, NEXTCLOUD_KEY_FOLDER).
                            </p>
                        ) : (
                            <>
                                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                                    <dt className="text-muted-foreground">Uploads nach</dt>
                                    <dd className="font-mono">{nextcloudFolders.write}</dd>
                                    <dt className="text-muted-foreground">Lesen aus</dt>
                                    <dd className="font-mono">{nextcloudFolders.read.join(' → ')}</dd>
                                </dl>
                                <NextcloudCheck />
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Mattermost</CardTitle>
                        <CardDescription>Nachrichten des Nexus-Bots</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {mattermostConfigured ? (
                            <>
                                {!production && (
                                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                                        <dt className="text-muted-foreground">Test-Kanal</dt>
                                        <dd className="font-mono">{testChannelId ?? 'nicht gesetzt: es wird nichts gesendet'}</dd>
                                        <dt className="text-muted-foreground">Test-User</dt>
                                        <dd className="font-mono">{testUsers.length > 0 ? testUsers.join(', ') : 'keine'}</dd>
                                    </dl>
                                )}
                                <MattermostCheck canTestThread={!production} />
                            </>
                        ) : (
                            <p className="text-sm">Nicht konfiguriert (MATTERMOST_URL, MATTERMOST_AUTH_TOKEN).</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
