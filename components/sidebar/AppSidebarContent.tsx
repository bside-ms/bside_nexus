'use client';

import { type ReactElement } from 'react';
import { Key, PieChart, Plug, Settings2 } from 'lucide-react';
import { SidebarContent, SidebarGroup } from '../ui/sidebar';
import { NavbarSecondary } from './NavbarSecondary';
import type { SidebarGroupNode } from '@/components/sidebar/NavbarGroups';
import { NavbarGroups } from '@/components/sidebar/NavbarGroups';
import { type NavbarItems, NavbarPrimary } from '@/components/sidebar/NavbarPrimary';

const baseUpperSidebarData: Array<NavbarItems> = [
    {
        title: 'Home',
        items: [
            { title: 'Dashboard', url: '/portal', icon: PieChart },
            { title: 'Arbeitszeiterfassung', url: '/hrp', icon: PieChart },
        ],
    },
];

const baseLowerSidebarData: Array<NavbarItems> = [
    {
        title: 'Dein Account',
        items: [{ title: 'Einstellungen', url: '/portal/settings', icon: Settings2 }],
    },
];

interface AppSidebarContentProps {
    groups?: Array<SidebarGroupNode>;
    hasKeyRole?: boolean;
    isSystemAdmin?: boolean;
}

export function AppSidebarContent({ groups, hasKeyRole, isSystemAdmin }: AppSidebarContentProps): ReactElement {
    const lowerSidebarData: Array<NavbarItems> =
        isSystemAdmin === true
            ? [
                  ...baseLowerSidebarData,
                  { title: 'System', items: [{ title: 'Integrationen', url: '/portal/admin/integrations', icon: Plug }] },
              ]
            : baseLowerSidebarData;
    // Clone base and inject key management if allowed
    const upperSidebarData: Array<NavbarItems> = baseUpperSidebarData.map((section) => ({
        ...section,
        items: [...(section.items ?? [])],
    }));
    if (hasKeyRole && upperSidebarData.length > 0) {
        const first = upperSidebarData[0]!;
        first.items = [...(first.items ?? []), { title: 'Schlüsselverwaltung', url: '/key', icon: Key }];
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
