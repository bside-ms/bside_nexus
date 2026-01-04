import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import AdvancedEntry from '@/components/hrp/AdvancedEntry';
import NavbarTop from '@/components/sidebar/NavbarTop';
import getUserSession from '@/lib/auth/getUserSession';
import { getActiveContractsForUser } from '@/lib/db/contractActions';

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

export default async function Page(): Promise<ReactElement> {
    const session = await getUserSession();
    const contracts = await getActiveContractsForUser(session!.id);

    return (
        <div className="">
            <NavbarTop items={breadCrumbs} sidebar={true} />
            <div className="flex flex-1 flex-col gap-4 p-4 max-w-2xl mx-auto">
                <AdvancedEntry contracts={contracts} />
            </div>
        </div>
    );
}
