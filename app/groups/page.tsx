import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { Toaster } from 'sonner';
import GroupOverviewCard from '@/components/group/overview/GroupOverviewCard';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Separator } from '@/components/ui/separator';
import { getUserAdminGroups, getUserGroups } from '@/lib/keycloak/groupActions';

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
    const groups = await getUserGroups();
    const adminGroups = await getUserAdminGroups();

    const circles = groups
        .filter((group) => group.attributes.groupType === 'kreis')
        .sort((a, b) => (a.attributes?.displayName ?? 'zzz').localeCompare(b.attributes?.displayName ?? 'zzz') ?? 0);

    const bodies = groups
        .filter((group) => group.attributes.groupType === 'koerperschaft')
        .sort((a, b) => a.attributes?.displayName?.localeCompare(b.attributes?.displayName ?? '') ?? 0);

    return (
        <div className="">
            <NavbarTop items={breadCrumbs} />
            <div className="space-y-6 p-10 pb-16">
                <div className="space-y-0.5">
                    <h2 className="text-2xl font-bold tracking-tight">Meine Vereine</h2>
                    <p>Hier findest du eine Übersicht über alle Gruppen auf die du innerhalb der B-Side zugreifen kannst.</p>
                </div>

                <Separator className="my-6" />

                <div className="flex flex-col space-y-8 lg:flex-row">
                    <div className="flex flex-1 flex-col gap-4 p-4">
                        <div className="grid auto-rows-min gap-4 md:grid-cols-2">
                            {bodies.map((body) => (
                                <GroupOverviewCard
                                    key={body.id}
                                    group={body}
                                    isAdmin={adminGroups.some((adminGroup) => adminGroup.id === body.id)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-0.5">
                    <h2 className="text-2xl font-bold tracking-tight">Meine Gruppen</h2>
                    <p>Hier findest du eine Übersicht über alle Gruppen auf die du innerhalb der B-Side zugreifen kannst.</p>
                </div>

                <Separator className="my-6" />

                <div className="flex flex-col space-y-8 lg:flex-row">
                    <div className="flex flex-1 flex-col gap-4 p-4">
                        <div className="grid auto-rows-min gap-4 md:grid-cols-2">
                            {circles.map((circle) => (
                                <GroupOverviewCard
                                    key={circle.id}
                                    group={circle}
                                    isAdmin={adminGroups.some((adminGroup) => adminGroup.id === circle.id)}
                                />
                            ))}
                        </div>
                    </div>

                    <Toaster position="top-right" richColors toastOptions={{}} />
                </div>
            </div>
        </div>
    );
}
