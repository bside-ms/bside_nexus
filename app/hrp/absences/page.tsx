import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import AbsencesPageContent from '@/components/hrp/AbsencesPageContent';
import NavbarTop from '@/components/sidebar/NavbarTop';
import getUserSession from '@/lib/auth/getUserSession';
import { getActiveContractsForUser } from '@/lib/db/contractActions';

const breadCrumbs = [
    {
        title: 'Zeiterfassung',
        url: '/hrp',
    },
    {
        title: 'Abwesenheiten',
        active: true,
    },
];

export const metadata: Metadata = {
    title: 'Abwesenheiten | B-Side Nexus',
    description: 'Urlaub und Krankheit erfassen',
    robots: 'noindex, nofollow',
};

export default async function Page(): Promise<ReactElement> {
    const session = await getUserSession();
    const contracts = await getActiveContractsForUser(session!.id);

    return (
        <div className="">
            <NavbarTop items={breadCrumbs} sidebar={true} />
            <div className="flex flex-1 flex-col gap-8 p-4 max-w-2xl mx-auto">
                <AbsencesPageContent contracts={contracts} />
            </div>
        </div>
    );
}
