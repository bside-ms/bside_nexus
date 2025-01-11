'use client';

import { Frame, Map, PieChart } from 'lucide-react';
import type { ReactElement } from 'react';
import { NavbarPrimary } from '@/components/sidebar/NavbarPrimary';
import { NavbarSecondary } from '@/components/sidebar/NavbarSecondary';
import { SidebarContent } from '@/components/ui/sidebar';

const data = {
    projects: [
        {
            name: 'Design Engineering',
            url: '#',
            icon: Frame,
        },
        {
            name: 'Sales & Marketing',
            url: '#',
            icon: PieChart,
        },
        {
            name: 'Travel',
            url: '#',
            icon: Map,
        },
    ],
};

export function AppSidebarContent(): ReactElement {
    return (
        <SidebarContent>
            <NavbarPrimary projects={data.projects} />
            <NavbarSecondary className="mt-auto" />
        </SidebarContent>
    );
}
