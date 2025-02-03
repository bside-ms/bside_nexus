import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import type { GroupMember } from '@/components/group/details/members/GroupMembersColumns';
import { GroupMembersColumns } from '@/components/group/details/members/GroupMembersColumns';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { DataTable } from '@/components/ui/datatable';
import { Separator } from '@/components/ui/separator';
import { getGroupById, getGroupMembers } from '@/lib/keycloak/groupActions';

export function generateStaticParams(): Array<{ id: string }> {
    // ToDo: Replace with real function.
    const groupIds = ['844eacda-e143-4012-b7d2-d2fe2639101e', 'c5df5b4e-d702-423b-9d52-2001109d6941'];
    return groupIds.map((id) => ({ id }));
}

export const revalidate = 300;

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
            title: group.attributes.categoryName ?? '',
        },
        {
            title: group.attributes.displayName ?? '',
            active: true,
        },
    ];

    const [membersGroup, groupMembers] = await getGroupMembers(group);

    const members: Array<GroupMember> = [];
    groupMembers.forEach((member) => {
        members.push({
            displayName: member.firstName ?? '-',
            username: member.username ?? '-',
            email: member.email ?? '-',
            status: member.attributes.status ?? undefined,
        });
    });

    return (
        <div className="">
            <NavbarTop items={breadCrumbs} />
            <div className="space-y-6 p-10 pb-16">
                <div className="space-y-0.5">
                    <h2 className="text-2xl font-bold tracking-tight">Gruppenverwaltung: {group.attributes.displayName ?? group.name}</h2>
                    <p>Hier findest du eine Übersicht über alle Gruppen auf die du innerhalb der B-Side zugreifen kannst.</p>
                </div>

                <Separator className="my-6" />

                <div className="space-y-8">
                    {membersGroup !== null && groupMembers.length > 0 && <DataTable columns={GroupMembersColumns} data={members} />}
                </div>
            </div>
        </div>
    );
};

export default Group;
