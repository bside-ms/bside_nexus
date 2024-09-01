import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import GroupInfo from '@/components/group/GroupInfo';
import GroupMembers from '@/components/group/GroupMembers';
import { getGroupById, getGroupMembers } from '@/lib/keycloak/groupActions';

const Group = async ({ params: { id: groupId } }: { params: { id: string } }): Promise<ReactElement> => {
    const group = await getGroupById(groupId);

    if (group === null) {
        redirect('/');
    }

    const [membersGroup, groupMembers] = await getGroupMembers(group);

    return (
        <div className="space-y-8">
            <GroupInfo group={group} />

            {membersGroup !== null && groupMembers.length > 0 && <GroupMembers group={membersGroup} members={groupMembers} />}
        </div>
    );
};

export default Group;
