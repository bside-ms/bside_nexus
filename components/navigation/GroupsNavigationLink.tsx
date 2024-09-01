'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import type { AugmentedGroupRepresentation } from '@/lib/keycloak/groupActions';
import { getGroupName } from '@/lib/keycloak/groupActions';

const GroupsNavigationLink = ({ group }: { group: AugmentedGroupRepresentation }): ReactElement => {
    const currentPath = usePathname();
    const groupLink = `/groups/${group.id}`;

    return (
        <Link key={group.path} href={groupLink}>
            <Button className="w-full justify-start" variant={currentPath === groupLink ? 'secondary' : 'ghost'}>
                {getGroupName(group)}
            </Button>
        </Link>
    );
};

export default GroupsNavigationLink;
