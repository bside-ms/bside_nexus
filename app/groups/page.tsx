import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { Toaster } from 'sonner';
import GroupOverviewCard from '@/components/group/overview/GroupOverviewCard';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getUserGroups } from '@/lib/db/groupActions';

const breadCrumbs = [
    {
        title: 'Meine Gruppen',
        active: true,
    },
];

export const metadata: Metadata = {
    title: 'B-Side Intern',
    description: 'Der interne Bereich der B-Side',
    robots: 'noindex, nofollow',
};

export default async function Page(): Promise<ReactElement> {
    const groups = await getUserGroups();

    const circles = groups
        .filter((group) => group.groupType === 'kreis')
        .sort((a, b) => (a?.displayName ?? 'zzz').localeCompare(b?.displayName ?? 'zzz') ?? 0);

    const bodies = groups
        .filter((group) => group.groupType === 'koerperschaft')
        .sort((a, b) => a?.displayName?.localeCompare(b?.displayName ?? '') ?? 0);

    return (
        <div className="">
            <NavbarTop items={breadCrumbs} />
            <div className="space-y-6 p-10 pb-16">
                <div className="space-y-0.5">
                    <h2 className="text-2xl font-bold tracking-tight">Meine Vereine</h2>
                    <p>Hier findest du eine Übersicht über deine Körperschaften der B-Side.</p>
                </div>

                <div className="flex flex-col space-y-8 lg:flex-row">
                    <div className="flex flex-1 flex-col gap-4 p-4">
                        <div className="grid auto-rows-min gap-4 lg:grid-cols-2">
                            {bodies.map((body) => (
                                <GroupOverviewCard key={body.id} group={body} />
                            ))}
                        </div>
                    </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-0.5">
                    <h2 className="text-2xl font-bold tracking-tight">Meine Gruppen</h2>
                    <p>Hier findest du eine Übersicht über alle deine Gruppen der B-Side.</p>
                </div>

                <div className="flex flex-col space-y-8 lg:flex-row">
                    <div className="flex flex-1 flex-col gap-4 p-4">
                        <div className="grid auto-rows-min gap-4 lg:grid-cols-2">
                            {circles.map((circle) => (
                                <GroupOverviewCard key={circle.id} group={circle} />
                            ))}

                            <Card className="flex h-full flex-col justify-between rounded-xl">
                                <CardHeader>
                                    <CardTitle>Alle weiteren Gruppen</CardTitle>
                                </CardHeader>
                                <CardContent className="grid flex-1 gap-6">
                                    Hier findest du eine Übersicht über alle Gruppen, in denen du (noch) nicht Mitglied bist.
                                </CardContent>
                                <CardFooter className="pt-2">
                                    <Link className="w-full" href="/groups/all">
                                        <Button size="default" variant="destructive" className="w-full text-base">
                                            Zur gesamten Gruppenübersicht
                                            <ArrowRight className="ml-2 size-4" />
                                        </Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                </div>

                <Toaster
                    position="top-right"
                    richColors
                    toastOptions={{}} // Voluntarily passing empty object as a workaround for `richColors` to work. Refer: https://github.com/shadcn-ui/ui/issues/2234.
                />
            </div>
        </div>
    );
}
