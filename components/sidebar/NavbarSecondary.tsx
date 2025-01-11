import Link from 'next/link';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { SiMattermost, SiNextcloud, SiOutline } from 'react-icons/si';
import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

const items = [
    {
        title: 'Cloud',
        url: 'https://cloud.b-side.ms/',
        icon: SiNextcloud,
    },
    {
        title: 'Mattermost',
        url: 'https://chat.b-side.ms/',
        icon: SiMattermost,
    },
    {
        title: 'Wiki',
        url: 'https://wiki.b-side.ms/',
        icon: SiOutline,
    },
];

export function NavbarSecondary({ ...props }: React.ComponentPropsWithoutRef<typeof SidebarGroup>): ReactElement {
    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild size="sm">
                                <Link href={item.url} target="_blank">
                                    <item.icon />
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
