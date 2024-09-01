import Link from 'next/link';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import type { AugmentedGroupRepresentation } from '@/lib/keycloak/groupActions';
import { sortGroups } from '@/lib/keycloak/groupActions';
import { getGroupName } from '@/lib/keycloak/groupActions';
import { getUserGroups } from '@/lib/keycloak/groupActions';

const GroupLink = ({ group }: { group: AugmentedGroupRepresentation }): ReactElement => (
    <Link key={group.path} href={`/groups/${group.id}`}>
        <Button variant="ghost">{getGroupName(group)}</Button>
    </Link>
);

const GroupsNavigation = async (): Promise<ReactElement> => {
    const userGroups = await getUserGroups();

    return (
        <div>
            <h3 className="mb-4 font-bold">Meine Gruppen</h3>

            <div className="flex flex-col gap-4">
                {sortGroups(userGroups).map((group) => (
                    <GroupLink key={group.id} group={group} />
                ))}
            </div>
        </div>
    );
};

export default GroupsNavigation;
