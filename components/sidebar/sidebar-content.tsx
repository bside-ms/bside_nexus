'use client';

import { Frame, LifeBuoy, Map, PieChart, Send } from 'lucide-react';
import type { ReactElement } from 'react';
import { NavPrimary } from '@/components/sidebar/nav-primary';
import { NavSecondary } from '@/components/sidebar/nav-secondary';
import { SidebarContent } from '@/components/ui/sidebar';

// Menu items.
const data = {
    navSecondary: [
        {
            title: 'Support',
            url: '#',
            icon: LifeBuoy,
        },
        {
            title: 'Feedback',
            url: '#',
            icon: Send,
        },
    ],
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
            <NavSecondary items={data.navSecondary} className="mt-auto" />
        </SidebarContent>
    );
}
