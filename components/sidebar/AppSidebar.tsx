'use server';

import { isEmpty } from 'lodash-es';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { AppSidebarContent } from '@/components/sidebar/AppSidebarContent';
import { AppSidebarFooter } from '@/components/sidebar/AppSidebarFooter';
import { AppSidebarHeader } from '@/components/sidebar/AppSidebarHeader';
import { Sidebar } from '@/components/ui/sidebar';
import getUserSession from '@/lib/auth/getUserSession';
import { getUserGroups, isArchivedGroup } from '@/lib/db/groupActions';
import { buildGroupTree, getCategoryName } from '@/lib/groupOverview';

export async function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>): Promise<ReactElement> {
    const user = await getUserSession();

    // Archived groups are only listed in the group overview.
    const activeGroups = (await getUserGroups()).filter((group) => !isArchivedGroup(group));

    const groups = (await buildGroupTree(activeGroups, user?.id ?? '')).map((node) => ({
        ...node,
        categoryName: getCategoryName(node),
    }));
    const hasKeyRole = user?.roles?.includes('schluesselverwaltung') ?? false;

    return (
        <Sidebar variant="inset" {...props}>
            <AppSidebarHeader />
            <AppSidebarContent groups={groups} hasKeyRole={hasKeyRole} />
            {user && (
                <AppSidebarFooter
                    user={{
                        name: user.name,
                        email: user.email,
                        avatar: !isEmpty(user.username) ? `/api/mattermost/${user.username}?fallback=none` : '',
                    }}
                />
            )}
        </Sidebar>
    );
}
