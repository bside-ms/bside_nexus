import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { Toaster } from 'sonner';
import ArchivedGroups from '@/components/group/overview/ArchivedGroups';
import GroupList from '@/components/group/overview/GroupList';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import getUserSession from '@/lib/auth/getUserSession';
import { getUserGroups } from '@/lib/db/groupActions';
import { buildGroupOverview } from '@/lib/groupOverview';
import { isKollektivMitglied } from '@/lib/groups';

const breadCrumbs = [
    {
        title: 'Meine Gruppen',
        active: true,
    },
];

export const metadata: Metadata = {
    title: 'B-Side Intern',
    description: 'Der interne Bereich der B-Side',
    robots: 'noindex, nofollow',
};

export default async function Page(): Promise<ReactElement> {
    const userId = (await getUserSession())?.id ?? '';
    const { bodies, groups, archived } = await buildGroupOverview(await getUserGroups(), userId);

    return (
        <>
            <NavbarTop items={breadCrumbs} />
            <div className="space-y-6 px-4 pt-4 pb-16 sm:px-6 sm:pt-6 lg:px-10 lg:pt-10">
                <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Meine Vereine</h2>
                            <p>
                                Hier findest du eine Übersicht über alle Vereine und Körperschaften innerhalb der B-Side auf deren interne
                                Dokumente du aktuell zugreifen kannst.
                            </p>
                        </div>
                        {(await isKollektivMitglied()) && (
                            <Link href="/portal/groups/all">
                                <Button size="lg" variant="outline">
                                    Zur Gesamtübersicht
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                <GroupList entries={bodies} emptyText="Du bist in keinem Verein Mitglied." />

                <Separator className="my-6" />

                <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Meine Gruppen</h2>
                            <p>Hier findest du eine Übersicht über alle deine Gruppen der B-Side.</p>
                        </div>
                        {(await isKollektivMitglied()) && (
                            <Link href="/portal/groups/all">
                                <Button size="lg" variant="outline">
                                    Zur Gesamtübersicht
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                <GroupList entries={groups} emptyText="Du bist in keiner Gruppe Mitglied." />

                <ArchivedGroups entries={archived} />

                <Toaster
                    position="top-right"
                    richColors
                    toastOptions={{}} // Voluntarily passing empty object as a workaround for `richColors` to work. Refer: https://github.com/shadcn-ui/ui/issues/2234.
                />
            </div>
        </>
    );
}
