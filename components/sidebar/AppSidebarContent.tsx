'use client';

import { type ReactElement } from 'react';
import { PieChart, Settings2, SquareTerminal } from 'lucide-react';
import type { NavbarItems } from '@/components/sidebar/NavbarPrimary';
import { NavbarPrimary } from '@/components/sidebar/NavbarPrimary';
import { NavbarSecondary } from '@/components/sidebar/NavbarSecondary';
import { SidebarContent } from '@/components/ui/sidebar';

const sidebarData: Array<NavbarItems> = [
    {
        title: 'Home',
        items: [{ title: 'Dashboard', url: '/', icon: PieChart }],
    },
    {
        title: 'Gruppenverwaltung',
        items: [
            { title: 'Meine Gruppen', url: '/groups', icon: PieChart },
            { title: 'Alle Gruppen', url: '/groups/all', icon: SquareTerminal },
        ],
    },
    {
        title: 'Einstellungen',
        items: [{ title: 'Mein Account', url: '/settings', icon: Settings2 }],
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
