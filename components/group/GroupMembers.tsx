import type { ReactElement } from 'react';
import GroupMembersTable from '@/components/group/GroupMembersTable';
import type { AugmentedGroupRepresentation } from '@/lib/keycloak/groupActions';
import { getGroupName } from '@/lib/keycloak/groupActions';
import type { AugmentedUserRepresentation } from '@/lib/keycloak/userActions';

const GroupMembers = ({
    group,
    members,
}: {
    group: AugmentedGroupRepresentation;
    members: Array<AugmentedUserRepresentation>;
}): ReactElement => {
    return (
        <div className="px-3">
            <h2 className="text-lg">{getGroupName(group)}</h2>

            <GroupMembersTable members={members} />
        </div>
    );
};

export default GroupMembers;
