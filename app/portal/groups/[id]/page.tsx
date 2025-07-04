import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { Toaster } from 'sonner';
import { GroupDetailsDescription } from '@/components/group/details/GroupDetailsDescription';
import { GroupDetailsHeader } from '@/components/group/details/GroupDetailsHeader';
import { GroupDetailsServices } from '@/components/group/details/GroupDetailsServices';
import { GroupDetailsSubgroups } from '@/components/group/details/GroupDetailsSubgroups';
import { GroupDetailsMembers } from '@/components/group/details/members/GroupDetailsMembers';
import type { GroupMember } from '@/components/group/details/members/GroupMembersColumns';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Separator } from '@/components/ui/separator';
import getUserSession from '@/lib/auth/getUserSession';
import { getGroupAdminStatus, getGroupById, getGroupMembers, getSubgroups, isGroupAdmin } from '@/lib/db/groupActions';

interface GroupPageProps {
    params: Promise<{
        id: string;
    }>;
}

const Group = async ({ params }: GroupPageProps): Promise<ReactElement> => {
    const { id: groupId } = await params;
    const group = await getGroupById(groupId);
    const user = await getUserSession();

    // Handle when the group is not found
    if (group === null) {
        redirect('/portal/groups');
    }

    const breadCrumbs = [
        {
            title: 'Meine Gruppen',
            url: `/portal/groups`,
        },
        {
            title: group.categoryName ?? '',
            url: `/portal/groups`,
        },
        {
            title: group.displayName ?? '',
            active: true,
        },
    ];

    // ToDo: Reload table when group members change (deletion, promotion, demotion).
    // ToDo: UseEffect to load the group members.
    const groupMemberPromise = getGroupMembers(groupId);
    const subgroupsPromise = getSubgroups(groupId);
    const isAdminPromise = getGroupAdminStatus(user?.id ?? '', group.id);
    const isGlobalAdminPromise = isGroupAdmin(user?.id ?? '', group.id, true);
    const [groupMembers, subgroups, isAdmin, isGlobalAdmin] = await Promise.all([
        groupMemberPromise,
        subgroupsPromise,
        isAdminPromise,
        isGlobalAdminPromise,
    ]);

    // ToDo: Fetch those values from the database.
    const [services] = [[]];

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
                <GroupDetailsHeader displayName={group.displayName ?? group.name} />
                <Separator className="my-6" />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="lg:col-span-2">
                        <GroupDetailsDescription
                            groupId={group.id}
                            wikiLink={group.wikiLink ?? ''}
                            websiteLink={group.websiteLink ?? ''}
                            description={group.description ?? ''}
                            isAdmin={isAdmin}
                            isGlobalAdmin={isGlobalAdmin}
                        />
                    </div>

                    <GroupDetailsSubgroups subgroups={subgroups} />
                    <GroupDetailsServices services={services ?? []} />
                </div>

                <Separator className="my-6" />

                <GroupDetailsMembers groupMembers={members} isAdmin={isAdmin} groupId={group.id} isGlobalAdmin={isGlobalAdmin} />
            </div>

            <Toaster
                position="top-right"
                richColors
                toastOptions={{}} // Voluntarily passing empty object as a workaround for `richColors` to work. Refer: https://github.com/shadcn-ui/ui/issues/2234.
            />
        </div>
    );
};

export default Group;
