import type { ReactElement } from 'react';
import GroupsNavigationLink from '@/components/navigation/GroupsNavigationLink';
import { sortGroups } from '@/lib/keycloak/groupActions';
import { getUserGroups } from '@/lib/keycloak/groupActions';

const GroupsNavigation = async (): Promise<ReactElement> => {
    const userGroups = await getUserGroups();

    return (
        <div>
            <h3 className="mb-4 font-bold">Meine Gruppen</h3>

            <div className="flex flex-col gap-4">
                {sortGroups(userGroups).map((group) => (
                    <GroupsNavigationLink key={group.id} group={group} />
                ))}
            </div>
        </div>
    );
};

export default GroupsNavigation;
