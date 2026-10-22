import type { LucideIcon } from 'lucide-react';
import { Clock, Info, Key, Mail, Settings2, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { SiMattermost } from 'react-icons/si';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import getUserSession from '@/lib/auth/getUserSession';
import { MATTERMOST_SUPPORT_CHANNEL_URL, MATTERMOST_SUPPORT_DM_URL } from '@/lib/constants';
import getSupportEmail from '@/lib/utils/getSupportEmail';
import isNotEmptyString from '@/lib/utils/isNotEmptyString';

const breadCrumbs = [
    {
        title: 'Dashboard',
        active: true,
    },
];

export const metadata: Metadata = {
    title: 'B-Side Intern',
    description: 'Der interne Bereich der B-Side',
    robots: 'noindex, nofollow',
};

interface QuickLink {
    title: string;
    description: string;
    url: string;
    icon: LucideIcon;
    role?: string;
}

const quickLinks: Array<QuickLink> = [
    { title: 'Gruppen', description: 'Deine Gruppen und ihre Mitglieder', url: '/portal/groups', icon: Users },
    {
        title: 'Arbeitszeiterfassung',
        description: 'Arbeitszeiten, Abwesenheiten und Urlaub',
        url: '/hrp',
        icon: Clock,
        role: 'arbeitszeiterfassung',
    },
    {
        title: 'Schlüsselverwaltung',
        description: 'Schlüssel ausgeben und zurücknehmen',
        url: '/key',
        icon: Key,
        role: 'schluesselverwaltung',
    },
    { title: 'Einstellungen', description: 'Dein Profil und dein Account', url: '/portal/settings', icon: Settings2 },
];

export default async function Page(): Promise<ReactElement> {
    // ToDo: Display latest news from Mattermost.
    // ToDo: Display upcoming events from Website.
    // ToDo: Display upcoming internal events from ???.

    const user = await getUserSession();
    const firstName = user?.name.split(' ')[0];
    const visibleQuickLinks = quickLinks.filter(({ role }) => role === undefined || (user?.roles.includes(role) ?? false));
    const supportEmail = getSupportEmail();

    return (
        <div className="">
            <NavbarTop items={breadCrumbs} />
            <div className="flex max-w-5xl flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold">{isNotEmptyString(firstName) ? `Hallo ${firstName}!` : 'Hallo!'}</h1>
                    <p className="text-muted-foreground">
                        Willkommen im Internen Portal der B-Side!
                        <br />
                        Dies ist der Nachfolger des{' '}
                        <Link href="/altes-portal" className="underline underline-offset-4 italic">
                            abgeschalteten Portals
                        </Link>
                        .
                    </p>
                </div>

                <Alert>
                    <Info />
                    <AlertTitle>Noch nicht alle Funktionen sind verfügbar</AlertTitle>
                    <AlertDescription className="gap-3">
                        <div>
                            <p>Einige Funktionen des alten Portals gibt es hier noch nicht und kommen nach und nach dazu, unter anderem:</p>
                            <ul className="mt-1 list-disc pl-5">
                                <li>Einladen neuer Benutzer*innen</li>
                                <li>Verwaltung von Untergruppen</li>
                            </ul>
                        </div>
                        <p>
                            Für diese Anliegen oder wenn dir etwas fehlt oder du nicht weiterkommst, schreib im Zweifel eine Nachricht bei
                            Mattermost im Kanal ~it_allgemeines oder eine Direktnachricht an @kennet.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" asChild>
                                <a href={MATTERMOST_SUPPORT_CHANNEL_URL} target="_blank" rel="noreferrer">
                                    <SiMattermost />
                                    ~it_allgemeines
                                </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                                <a href={MATTERMOST_SUPPORT_DM_URL} target="_blank" rel="noreferrer">
                                    <SiMattermost />
                                    DM an @kennet
                                </a>
                            </Button>
                            {supportEmail !== null && (
                                <Button variant="outline" size="sm" asChild>
                                    <a href={`mailto:${supportEmail}`}>
                                        <Mail />
                                        {supportEmail}
                                    </a>
                                </Button>
                            )}
                        </div>
                    </AlertDescription>
                </Alert>

                <div className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold">Schnellzugriff</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {visibleQuickLinks.map(({ title, description, url, icon: Icon }) => (
                            <Link key={url} href={url} className="group">
                                <Card className="h-full transition-colors group-hover:bg-zinc-50 dark:group-hover:bg-zinc-900">
                                    <CardHeader className="flex-row items-center gap-4 space-y-0">
                                        <Icon className="size-5 shrink-0" />
                                        <div className="flex flex-col gap-1">
                                            <CardTitle className="text-base">{title}</CardTitle>
                                            <CardDescription>{description}</CardDescription>
                                        </div>
                                    </CardHeader>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
