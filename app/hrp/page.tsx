'use client';

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import AdvancedEntry from '@/components/hrp/AdvancedEntry';
import QuickEntry from '@/components/hrp/QuickEntry';
import NavbarTop from '@/components/sidebar/NavbarTop';

const breadCrumbs = [
    {
        title: 'Zeiterfassung',
        active: true,
    },
];

/*
export const metadata: Metadata = {
    title: 'B-Side Intern',
    description: 'Der interne Bereich der B-Side',
    robots: 'noindex, nofollow',
};
 */

export default function Page(): ReactElement {
    const [currentTime, setCurrentTime] = useState<string>('');

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('de-DE'));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="">
            <NavbarTop items={breadCrumbs} sidebar={true} />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <QuickEntry />
                    <div className="col-span-2">
                        <AdvancedEntry />
                    </div>
                </div>
                <div className="min-h-80 flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/50" />
            </div>
        </div>
    );
}
