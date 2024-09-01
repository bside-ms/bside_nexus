import type { ReactElement } from 'react';
import type { AugmentedGroupRepresentation } from '@/lib/keycloak/groupActions';
import { getGroupName } from '@/lib/keycloak/groupActions';

const GroupInfo = ({ group }: { group: AugmentedGroupRepresentation }): ReactElement => {
    return (
        <div className="bg-gray-500 p-4 text-white">
            <h1 className="text-2xl">{getGroupName(group)}</h1>
        </div>
    );
};

export default GroupInfo;
