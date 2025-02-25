'use client';

import { Fragment, type ReactElement } from 'react';
import { type LucideIcon } from 'lucide-react';
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

export interface NavbarItems {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: Array<{
        title: string;
        url: string;
        icon?: LucideIcon;
    }>;
}

export function NavbarPrimary({ navbar }: { navbar: Array<NavbarItems> }): ReactElement {
    return (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            {navbar.map((item) => (
                <Fragment key={item.title}>
                    <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
                    <SidebarMenu>
                        {item.items?.map((subItem) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild>
                                    <a href={subItem.url}>
                                        {subItem.icon && <subItem.icon />}
                                        <span>{subItem.title}</span>
                                    </a>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </Fragment>
            ))}
        </SidebarGroup>
    );
}
