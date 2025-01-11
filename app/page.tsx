import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import NavbarTop from '@/components/sidebar/NavbarTop';

const breadCrumbs = [
    {
        title: 'Dashboard',
        active: true,
    },
];

export const metadata: Metadata = {
    title: 'B-Side Intern',
    description: 'Der interne Bereich der B-Side',
    robots: 'noindex, nofollow',
};

export default function Page(): ReactElement {
    return (
        <div className="">
            <NavbarTop items={breadCrumbs} />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <div className="aspect-video rounded-xl bg-zinc-100 dark:bg-zinc-800/50" />
                    <div className="aspect-video rounded-xl bg-zinc-100 dark:bg-zinc-800/50" />
                    <div className="aspect-video rounded-xl bg-zinc-100 dark:bg-zinc-800/50" />
                </div>
                <div className="min-h-80 flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/50" />
            </div>
        </div>
    );
}
