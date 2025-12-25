import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import QuickEntry from '@/components/hrp/QuickEntry';
import NavbarTop from '@/components/sidebar/NavbarTop';

const breadCrumbs = [
    {
        title: 'Zeiterfassung',
        url: '/hrp',
    },
    {
        title: 'Schnellerfassung',
        active: true,
    },
];

export const metadata: Metadata = {
    title: 'Schnellerfassung | B-Side Nexus',
    description: 'Arbeitszeit schnell erfassen',
    robots: 'noindex, nofollow',
};

export default function Page(): ReactElement {
    return (
        <div className="">
            <NavbarTop items={breadCrumbs} sidebar={true} />
            <div className="flex flex-1 flex-col gap-4 p-4 max-w-2xl mx-auto">
                <QuickEntry />
            </div>
        </div>
    );
}
