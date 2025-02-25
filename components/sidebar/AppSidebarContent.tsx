'use client';

import { type ReactElement } from 'react';
import { PieChart, SquareTerminal } from 'lucide-react';
import type { NavbarItems } from '@/components/sidebar/NavbarPrimary';
import { NavbarPrimary } from '@/components/sidebar/NavbarPrimary';
import { NavbarSecondary } from '@/components/sidebar/NavbarSecondary';
import { SidebarContent } from '@/components/ui/sidebar';

const sidebarData: Array<NavbarItems> = [
    {
        title: 'Gruppenverwaltung',
        url: '#',
        icon: SquareTerminal,
        isActive: true,
        items: [
            { title: 'Meine Gruppen', url: '/groups', icon: PieChart },
            { title: 'Alle Gruppen', url: '/groups/all', icon: SquareTerminal },
        ],
    },
];

export function AppSidebarContent(): ReactElement {
    return (
        <SidebarContent>
            <NavbarPrimary navbar={sidebarData ?? []} />
            <NavbarSecondary className="mt-auto" />
        </SidebarContent>
    );
}
