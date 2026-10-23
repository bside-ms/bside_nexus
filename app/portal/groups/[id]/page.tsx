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
import {
    canManageGroup,
    canViewGroup,
    getGroupAdminStatus,
    getGroupById,
    getGroupMembers,
    getVisibleSubgroups,
    isArchivedGroup,
    isGlobalAdmin as isSystemAdminUser,
    isLegacySubgroup,
} from '@/lib/db/groupActions';
import isNotEmptyString from '@/lib/utils/isNotEmptyString';

interface GroupPageProps {
    params: Promise<{
        id: string;
    }>;
}

const Group = async ({ params }: GroupPageProps): Promise<ReactElement> => {
    const { id: groupId } = await params;
    const group = await getGroupById(groupId);
    const user = await getUserSession();
    const userId = user?.id ?? '';

    // Hidden groups behave like groups that do not exist.
    if (group === null || !(await canViewGroup(userId, group))) {
        redirect('/portal/groups');
    }

    const parentGroup = group.parentGroup === null ? null : await getGroupById(group.parentGroup);
    const parent = parentGroup !== null && (await canViewGroup(userId, parentGroup)) ? parentGroup : null;

    // Old subgroups have no category of their own.
    const categoryName = isNotEmptyString(group.categoryName) ? group.categoryName : (parent?.categoryName ?? '');

    const breadCrumbs = [
        {
            title: 'Meine Gruppen',
            url: `/portal/groups`,
        },
        ...(isNotEmptyString(categoryName)
            ? [{ title: categoryName, url: `/portal/groups`, className: parent === null ? undefined : 'hidden lg:block' }]
            : []),
        ...(parent === null ? [] : [{ title: parent.displayName, url: `/portal/groups/${parent.id}` }]),
        {
            title: group.displayName ?? '',
            active: true,
        },
    ];

    // ToDo: UseEffect to load the group members.
    const [groupMembers, subgroups, isAdmin, canManage] = await Promise.all([
        getGroupMembers(groupId),
        getVisibleSubgroups(groupId, userId),
        getGroupAdminStatus(userId, group.id),
        canManageGroup(userId, group),
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
            email: canManage ? (member.email ?? '-') : '',
            status: !member.enabled ? 'disabled' : member.isAdmin ? 'admin' : 'member',
        });
    });

    return (
        <div className="">
            <NavbarTop items={breadCrumbs} />
            <div className="space-y-6 px-4 pt-4 pb-16 sm:px-6 sm:pt-6 lg:px-10 lg:pt-10">
                <GroupDetailsHeader
                    displayName={group.displayName ?? group.name}
                    isPermission={group.groupType === 'permission'}
                    parent={parent}
                    isLegacySubgroup={isLegacySubgroup(group)}
                    isArchived={isArchivedGroup(group)}
                />
                <Separator className="my-6" />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="lg:col-span-2">
                        <GroupDetailsDescription
                            groupId={group.id}
                            wikiLink={group.wikiLink ?? ''}
                            websiteLink={group.websiteLink ?? ''}
                            description={group.description ?? ''}
                            isAdmin={isAdmin}
                            canManage={canManage}
                        />
                    </div>

                    {/* Only one level of subgroups. */}
                    {group.parentGroup === null && <GroupDetailsSubgroups subgroups={subgroups} />}
                    <GroupDetailsServices services={services ?? []} />
                </div>

                <Separator className="my-6" />

                <GroupDetailsMembers
                    groupMembers={members}
                    groupId={group.id}
                    canManage={canManage}
                    requiresAdmin={!group.parentAdminsManage}
                    isSystemAdmin={isSystemAdminUser(userId)}
                    currentUserId={userId}
                />
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
