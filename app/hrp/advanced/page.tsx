import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import AdvancedEntry from '@/components/hrp/AdvancedEntry';
import NavbarTop from '@/components/sidebar/NavbarTop';

const breadCrumbs = [
    {
        title: 'Zeiterfassung',
        url: '/hrp',
    },
    {
        title: 'Ausführliche Erfassung',
        active: true,
    },
];

export const metadata: Metadata = {
    title: 'Ausführliche Erfassung | B-Side Nexus',
    description: 'Arbeitszeit detailliert erfassen',
    robots: 'noindex, nofollow',
};

export default function Page(): ReactElement {
    return (
        <div className="">
            <NavbarTop items={breadCrumbs} sidebar={true} />
            <div className="flex flex-1 flex-col gap-4 p-4 max-w-2xl mx-auto">
                <AdvancedEntry />
            </div>
        </div>
    );
}
