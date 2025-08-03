import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

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
    // ToDo: Display latest news from Mattermost.
    // ToDo: Display upcoming events from Website.
    // ToDo: Display upcoming internal events from ???.

    return (
        <div className="">
            <NavbarTop items={breadCrumbs} />
            <div className="flex flex-1 flex-col gap-4 p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="text-xl underline underline-offset-4">Informationen zur Webseite</CardHeader>
                        <CardContent className="px-6">
                            <p>Diese Webseite befindet sich noch in der aktiven Entwicklung.</p>
                            <p className="py-4">
                                Bei Rückfragen aller Art wendet euch bitte an: <a href="mailto:it@b-side.ms">it@b-side.ms</a>
                            </p>
                        </CardContent>
                    </Card>
                    <div className="aspect-video rounded-xl bg-zinc-100 dark:bg-zinc-800/50" />
                    <div className="aspect-video rounded-xl bg-zinc-100 dark:bg-zinc-800/50" />
                </div>
                <div className="min-h-80 flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/50" />
            </div>
        </div>
    );
}
