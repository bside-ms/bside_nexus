'use client';

import { type ReactElement } from 'react';
import { PieChart, Settings2 } from 'lucide-react';
import { SidebarContent, SidebarGroup } from '../ui/sidebar';
import { NavbarSecondary } from './NavbarSecondary';
import { NavbarGroups } from '@/components/sidebar/NavbarGroups';
import { type NavbarItems, NavbarPrimary } from '@/components/sidebar/NavbarPrimary';
import type { Group } from '@/db/schema';

const upperSidebarData: Array<NavbarItems> = [
    {
        title: 'Home',
        items: [{ title: 'Dashboard', url: '/portal', icon: PieChart }],
    },
];

const lowerSidebarData: Array<NavbarItems> = [
    {
        title: 'Dein Account',
        items: [{ title: 'Einstellungen', url: '/portal/settings', icon: Settings2 }],
    },
];

interface AppSidebarContentProps {
    groups?: Array<Group>;
}

export function AppSidebarContent({ groups }: AppSidebarContentProps): ReactElement {
    return (
        <SidebarContent>
            <SidebarGroup className="mt-4 group-data-[collapsible=icon]:hidden">
                <NavbarPrimary navbar={upperSidebarData ?? []} />
                <NavbarGroups groups={groups} />
                <NavbarPrimary navbar={lowerSidebarData ?? []} />
            </SidebarGroup>
            <NavbarSecondary className="mt-auto" />
        </SidebarContent>
    ) as ReactElement;
}
