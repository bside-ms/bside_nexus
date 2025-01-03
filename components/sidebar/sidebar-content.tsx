'use client';

import { Frame, Map, PieChart } from 'lucide-react';
import type { ReactElement } from 'react';
import { NavPrimary } from '@/components/sidebar/nav-primary';
import { NavSecondary } from '@/components/sidebar/nav-secondary';
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
            <NavPrimary projects={data.projects} />
            <NavSecondary className="mt-auto" />
        </SidebarContent>
    );
}
