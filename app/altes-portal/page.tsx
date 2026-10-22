import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { SiMattermost } from 'react-icons/si';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
    title: 'Altes Portal abgeschaltet | B-Side Intern',
};

const channelUrl = 'https://chat.b-side.ms/bside/channels/it_allgemeines';
const directMessageUrl = 'https://chat.b-side.ms/bside/messages/@kennet';

// Öffentliche Landing-Page für Weiterleitungen von https://portal.b-side.ms
// In middleware.ts vom Login ausgenommen.
export default function Page(): ReactElement {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6">
                <div className="flex justify-center gap-2 md:justify-start">
                    <span className="flex items-center gap-2 font-medium">
                        B-Side
                        <small className="px-4">Interner Bereich</small>
                    </span>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="flex w-full max-w-md flex-col gap-6">
                        <div className="flex flex-col gap-2 text-center">
                            <h1 className="text-2xl font-bold">Das Portal wurde abgeschaltet!</h1>
                            <p className="text-muted-foreground text-balance text-sm">
                                portal.b-side.ms ist aufgrund einer aktuellen weltweiten Sicherheitslücke in der Programmiersprache PHP
                                vorsorglich offline genommen worden.
                            </p>
                            <p className="text-muted-foreground text-balance text-sm">
                                Wir planen <strong>nicht</strong> das Portal weiterhin zu pflegen. Der Nachfolger ist dieses Portal "B-Side
                                Intern".
                            </p>
                        </div>
                        <Button variant="secondary" className="w-full" asChild>
                            <Link href="/portal">
                                <ArrowRight />
                                Weiter zu B-Side Intern
                            </Link>
                        </Button>
                        <div className="rounded-lg border p-4 text-sm">
                            <p className="font-medium">Noch nicht alle Funktionen sind verfügbar</p>
                            <p className="text-muted-foreground mt-1">
                                Einige Funktionen des alten Portals gibt es in B-Side Intern noch nicht. Wenn dir etwas fehlt oder du nicht
                                weiterkommst, schreib im Zweifel eine Nachricht bei Mattermost im Kanal{' '}
                                <a
                                    href={channelUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-semibold underline underline-offset-4"
                                >
                                    ~it_allgemeines
                                </a>{' '}
                                oder eine Direktnachricht an{' '}
                                <a
                                    href={directMessageUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-semibold underline underline-offset-4"
                                >
                                    @kennet
                                </a>
                                .
                            </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            <Button variant="outline" className="w-full" asChild>
                                <a href={channelUrl} target="_blank" rel="noreferrer">
                                    <SiMattermost />
                                    ~it_allgemeines
                                </a>
                            </Button>
                            <Button variant="outline" className="w-full" asChild>
                                <a href={directMessageUrl} target="_blank" rel="noreferrer">
                                    <SiMattermost />
                                    DM an @kennet
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="relative hidden lg:block">
                <img src="/login.jpeg" alt="" className="absolute inset-0 size-full object-cover dark:brightness-[0.75]" />
            </div>
        </div>
    );
}
