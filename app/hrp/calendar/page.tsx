import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Overview from '@/components/hrp/Overview';
import NavbarTop from '@/components/sidebar/NavbarTop';

const breadCrumbs = [
    {
        title: 'Zeiterfassung',
        url: '/hrp',
    },
    {
        title: 'Überblick',
        active: true,
    },
];

export const metadata: Metadata = {
    title: 'Überblick | B-Side Nexus',
    description: 'Kalenderübersicht der Arbeitszeit',
    robots: 'noindex, nofollow',
};

export default function Page(): ReactElement {
    return (
        <div className="">
            <NavbarTop items={breadCrumbs} sidebar={true} />
            <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                <Overview />
            </div>
        </div>
    );
}
