'use server';

import type { ReactElement } from 'react';
import type * as React from 'react';
import { AppSidebarContent } from '@/components/sidebar/sidebar-content';
import { AppSidebarFooter } from '@/components/sidebar/sidebar-footer';
import { AppSidebarHeader } from '@/components/sidebar/sidebar-header';
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
                        avatar: 'https://avatars.githubusercontent.com/u/10064425?v=4',
                    }}
                />
            )}
        </Sidebar>
    );
}
