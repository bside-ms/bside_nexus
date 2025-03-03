import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { Toaster } from 'sonner';
import { GroupDetailsMembersForm } from '@/components/group/details/members/GroupDetailsMembersForm';
import { SectionHeader } from '@/components/group/SectionHeader';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import getUserSession from '@/lib/auth/getUserSession';
import { getGroupById, isGroupAdmin } from '@/lib/db/groupActions';

const Group = async ({ params: { id: groupId } }: { params: { id: string } }): Promise<ReactElement> => {
    const group = await getGroupById(groupId);
    const user = await getUserSession();

    // Handle when the group is not found
    if (group === null) {
        redirect('/groups');
    }

    const breadCrumbs = [
        {
            title: 'Meine Gruppen',
            url: `/groups`,
        },
        {
            title: group.categoryName ?? '',
            url: `/groups`,
        },
        {
            title: group.displayName ?? '',
            url: `/groups/${groupId}`,
        },
        {
            title: 'Mitglieder hinzufügen',
            active: true,
        },
    ];

    const isAdmin = await isGroupAdmin(user?.id ?? '', group.id, true);
    if (!isAdmin) {
        redirect(`/groups/${groupId}`);
    }

    return (
        <>
            <NavbarTop items={breadCrumbs} />
            <div className="space-y-6 p-10 pb-16">
                <SectionHeader
                    title={`Gruppenverwaltung: ${group.displayName ?? group.name}`}
                    description="Hier kannst du Mitglieder zu dieser Gruppe hinzufügen."
                />
                <Separator className="my-6" />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card className="">
                        <CardHeader className="">
                            <CardTitle>Mitglieder hinzufügen</CardTitle>
                        </CardHeader>
                        <CardContent className="">
                            <GroupDetailsMembersForm groupId={group.id} />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Toaster
                position="top-right"
                richColors
                toastOptions={{}} // Voluntarily passing empty object as a workaround for `richColors` to work. Refer: https://github.com/shadcn-ui/ui/issues/2234.
            />
        </>
    );
};

export default Group;
