import type { ReactElement } from 'react';
import GroupMembersTable from '@/components/group/GroupMembersTable';
import type { AugmentedUserRepresentation } from '@/lib/keycloak/userActions';

const GroupMembers = ({ members }: { members: Array<AugmentedUserRepresentation> }): ReactElement => {
    return (
        <div className="px-3">
            <GroupMembersTable members={members} />
        </div>
    );
};

export default GroupMembers;
