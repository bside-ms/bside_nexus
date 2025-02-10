import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { Toaster } from 'sonner';
import type { GroupMember } from '@/components/group/details/members/GroupMembersColumns';
import { GroupMembersColumns } from '@/components/group/details/members/GroupMembersColumns';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { DataTable } from '@/components/ui/datatable';
import { Separator } from '@/components/ui/separator';
import { getGroupById, getGroupMembers } from '@/lib/db/groupActions';

const Group = async ({ params: { id: groupId } }: { params: { id: string } }): Promise<ReactElement> => {
    const group = await getGroupById(groupId);

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
        },
        {
            title: group.displayName ?? '',
            active: true,
        },
    ];

    // ToDo: Reload table when group members change (deletion, promotion, demotion).
    // ToDo: UseEffect to load the group members.
    const groupMembers = await getGroupMembers(groupId);

    const members: Array<GroupMember> = [];
    groupMembers.forEach((member) => {
        members.push({
            userId: member.id,
            groupId: group.id,
            displayName: member.displayName ?? '-',
            username: member.username ?? '-',
            email: member.email ?? '-',
            status: !member.enabled ? 'disabled' : member.isAdmin ? 'admin' : 'member',
        });
    });

    return (
        <div className="">
            <NavbarTop items={breadCrumbs} />
            <div className="space-y-6 p-10 pb-16">
                <div className="space-y-0.5">
                    <h2 className="text-2xl font-bold tracking-tight">Gruppenverwaltung: {group.displayName ?? group.name}</h2>
                    <p>Hier findest du eine Übersicht über alle Gruppen auf die du innerhalb der B-Side zugreifen kannst.</p>
                </div>

                <Separator className="my-6" />

                <div className="space-y-8">{groupMembers.length > 0 && <DataTable columns={GroupMembersColumns} data={members} />}</div>
            </div>

            <Toaster
                position="top-right"
                richColors
                // Voluntarily passing empty object as a workaround for `richColors`
                // to work. Refer: https://github.com/shadcn-ui/ui/issues/2234.
                toastOptions={{}}
            />
        </div>
    );
};

export default Group;
