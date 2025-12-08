'use client';

import { type ReactElement } from 'react';
import { Key, PieChart, Settings2 } from 'lucide-react';
import { SidebarContent, SidebarGroup } from '../ui/sidebar';
import { NavbarSecondary } from './NavbarSecondary';
import { NavbarGroups } from '@/components/sidebar/NavbarGroups';
import { type NavbarItems, NavbarPrimary } from '@/components/sidebar/NavbarPrimary';
import type { Group } from '@/db/schema';

const baseUpperSidebarData: Array<NavbarItems> = [
    {
        title: 'Home',
        items: [
            { title: 'Dashboard', url: '/portal', icon: PieChart },
            { title: 'Arbeitszeiterfassung', url: '/hrp', icon: PieChart },
        ],
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
    hasKeyRole?: boolean;
}

export function AppSidebarContent({ groups, hasKeyRole }: AppSidebarContentProps): ReactElement {
    // Clone base and inject key management if allowed
    const upperSidebarData: Array<NavbarItems> = baseUpperSidebarData.map((section) => ({
        ...section,
        items: [...section.items],
    }));
    if (hasKeyRole) {
        upperSidebarData[0].items.push({ title: 'Schlüsselverwaltung', url: '/key', icon: Key });
    }
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
