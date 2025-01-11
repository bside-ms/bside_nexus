'use server';

import { isEmpty } from 'lodash-es';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { AppSidebarContent } from '@/components/sidebar/AppSidebarContent';
import { AppSidebarFooter } from '@/components/sidebar/AppSidebarFooter';
import { AppSidebarHeader } from '@/components/sidebar/AppSidebarHeader';
import { Sidebar } from '@/components/ui/sidebar';
import getUserSession from '@/lib/auth/getUserSession';

export async function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>): Promise<ReactElement> {
    const user = await getUserSession();

    return (
        <Sidebar variant="inset" {...props}>
            <AppSidebarHeader />
            <AppSidebarContent />
            {user && (
                <AppSidebarFooter
                    user={{
                        name: user.name,
                        email: user.email,
                        avatar: !isEmpty(user.username) ? `/api/mattermost/${user.username}` : '',
                    }}
                />
            )}
        </Sidebar>
    );
}
