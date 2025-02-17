import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { Toaster } from 'sonner';
import GroupOverviewCard from '@/components/group/overview/GroupOverviewCard';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Separator } from '@/components/ui/separator';
import { getAllGroups } from '@/lib/db/groupActions';

const breadCrumbs = [
    {
        title: 'Meine Gruppen',
        url: '/groups',
    },
    {
        title: 'Alle Gruppen',
        active: true,
    },
];

export const metadata: Metadata = {
    title: 'B-Side Intern',
    description: 'Der interne Bereich der B-Side',
    robots: 'noindex, nofollow',
};

export default async function Page(): Promise<ReactElement> {
    const groups = await getAllGroups();

    const circles = groups
        .filter((group) => group.groupType === 'kreis')
        .sort((a, b) => (a?.displayName ?? 'zzz').localeCompare(b?.displayName ?? 'zzz') ?? 0);

    const bodies = groups
        .filter((group) => group.groupType === 'koerperschaft')
        .sort((a, b) => a?.displayName?.localeCompare(b?.displayName ?? '') ?? 0);

    return (
        <div className="">
            <NavbarTop items={breadCrumbs} />
            <div className="space-y-6 p-10 pb-16">
                <div className="space-y-0.5">
                    <h2 className="text-2xl font-bold tracking-tight">Alle Vereine</h2>
                    <p>Hier findest du eine Übersicht über alle Körperschaften der B-Side.</p>
                </div>

                <Separator className="my-6" />

                <div className="flex flex-col space-y-8 lg:flex-row">
                    <div className="flex flex-1 flex-col gap-4 p-4">
                        <div className="grid auto-rows-min gap-4 lg:grid-cols-2">
                            {bodies.map((body) => (
                                <GroupOverviewCard key={body.id} group={body} />
                            ))}
                        </div>
                    </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-0.5">
                    <h2 className="text-2xl font-bold tracking-tight">Alle Gruppen</h2>
                    <p>Hier findest du eine Übersicht über alle Gruppen der B-Side.</p>
                </div>

                <Separator className="my-6" />

                <div className="flex flex-col space-y-8 lg:flex-row">
                    <div className="flex flex-1 flex-col gap-4 p-4">
                        <div className="grid auto-rows-min gap-4 lg:grid-cols-2">
                            {circles.map((circle) => (
                                <GroupOverviewCard key={circle.id} group={circle} />
                            ))}
                        </div>
                    </div>

                    <Toaster
                        position="top-right"
                        richColors
                        toastOptions={{}} // Voluntarily passing empty object as a workaround for `richColors` to work. Refer: https://github.com/shadcn-ui/ui/issues/2234.
                    />
                </div>
            </div>
        </div>
    );
}
