import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { Toaster } from 'sonner';
import ArchivedGroups from '@/components/group/overview/ArchivedGroups';
import CreateGroupDialog from '@/components/group/overview/CreateGroupDialog';
import GroupList from '@/components/group/overview/GroupList';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Separator } from '@/components/ui/separator';
import getUserSession from '@/lib/auth/getUserSession';
import { canViewGroup, getAllGroups, getGroupCategories, isGlobalAdmin } from '@/lib/db/groupActions';
import { buildGroupOverview } from '@/lib/groupOverview';

const breadCrumbs = [
    {
        title: 'Meine Gruppen',
        url: '/portal/groups',
    },
    {
        title: 'Alle Gruppen',
        active: true,
    },
];

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'B-Side Intern',
    description: 'Der interne Bereich der B-Side',
    robots: 'noindex, nofollow',
};

export default async function Page(): Promise<ReactElement> {
    const user = await getUserSession();
    const userId = user?.id ?? '';
    const isSystemAdmin = isGlobalAdmin(userId);
    if (user?.members?.includes('/koerperschaften/kollektiv/mitglieder') !== true && !isSystemAdmin) {
        redirect('/portal');
    }

    const allGroups = await getAllGroups();
    const isVisible = await Promise.all(allGroups.map((group) => canViewGroup(userId, group)));
    const { bodies, groups, archived } = await buildGroupOverview(
        allGroups.filter((_, index) => isVisible[index]),
        userId,
    );

    return (
        <div className="">
            <NavbarTop items={breadCrumbs} />
            <div className="space-y-6 px-4 pt-4 pb-16 sm:px-6 sm:pt-6 lg:px-10 lg:pt-10">
                <div className="space-y-0.5">
                    <h2 className="text-2xl font-bold tracking-tight">Alle Vereine</h2>
                    <p>Hier findest du eine Übersicht über alle Körperschaften der B-Side.</p>
                </div>

                <Separator className="my-6" />

                <GroupList entries={bodies} emptyText="Es gibt keine Vereine." />

                <Separator className="my-6" />

                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-0.5">
                        <h2 className="text-2xl font-bold tracking-tight">Alle Gruppen</h2>
                        <p>Hier findest du eine Übersicht über alle Gruppen der B-Side.</p>
                    </div>
                    {isSystemAdmin && <CreateGroupDialog categories={await getGroupCategories()} />}
                </div>

                <Separator className="my-6" />

                <GroupList entries={groups} emptyText="Es gibt keine Gruppen." />

                <ArchivedGroups entries={archived} />

                <Toaster
                    position="top-right"
                    richColors
                    toastOptions={{}} // Voluntarily passing empty object as a workaround for `richColors` to work. Refer: https://github.com/shadcn-ui/ui/issues/2234.
                />
            </div>
        </div>
    );
}
