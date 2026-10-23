import { LinkIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import type { Group } from '@/db/schema';
import { cn } from '@/lib/utils';

const GroupLogo = ({ group, className }: { group: Group; className?: string }): ReactElement | null => {
    const { categoryName } = group;

    if (categoryName === undefined) {
        return null;
    }

    switch (categoryName) {
        case 'Kulturverein':
            return (
                <HoverCard>
                    <HoverCardTrigger asChild>
                        <div className={cn('flex aspect-square size-10 shrink-0 items-center justify-center rounded-lg', className)}>
                            <Image src="/logo_kv.png" alt="KV" width={120} height={120} />
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                        <div className="flex justify-between space-x-4">
                            <Avatar className="rounded-none!">
                                <AvatarImage src="/logo_kv.png" alt="Avatar" />
                                <AvatarFallback>KV</AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <h4 className="font-semibold">Der Kulturverein</h4>
                                <p>Der B-Side Kultur e.V. ist der gemeinnützige Kulturverein innerhalb der B-Side.</p>
                                <p>
                                    Was rechtlich nicht in den Zuständigkeitsbereich der Mitgliederversammlung fällt, liegt im Spielfeld der
                                    Arbeitskreise.
                                </p>
                                <div className="flex items-center pt-2">
                                    <LinkIcon className="mr-2 size-4 opacity-70" />{' '}
                                    <Link href="https://b-side.ms/kultur" target="_blank">
                                        <span className="text-muted-foreground text-sm">Mehr Informationen</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </HoverCardContent>
                </HoverCard>
            );

        case 'GmbH':
            return (
                <HoverCard>
                    <HoverCardTrigger asChild>
                        <div className={cn('flex aspect-square size-10 shrink-0 items-center justify-center rounded-lg', className)}>
                            <Image src="/logo_gmbh.png" alt="GmbH" width={120} height={120} />
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                        <div className="flex justify-between space-x-4">
                            <Avatar className="rounded-none!">
                                <AvatarImage src="/logo_gmbh.png" alt="Avatar" />
                                <AvatarFallback>GmbH</AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <h4 className="font-semibold">Die B-Side GmbH</h4>
                                <p>
                                    Die GmbH wurde gegründet, um das soziokulturelle Quartierszentrum B-Side am Hafen zu entwickeln und
                                    betreiben. Ab der Eröffnung übernimmt sie die Aufgabe der Hausverwaltung und stellt die Infrastruktur
                                    der B-Side für gemeinnützige und gemeinwohlorientierte Nutzungen zur Verfügung. Sie fungiert als
                                    Vermieterin der Räumlichkeiten und übernimmt alle nicht-gemeinnützigen Aufgaben im Haus.
                                </p>
                                <div className="flex items-center pt-2">
                                    <LinkIcon className="mr-2 size-4 opacity-70" />{' '}
                                    <Link href="https://b-side.ms/quartier" target="_blank">
                                        <span className="text-muted-foreground text-sm">Mehr Informationen</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </HoverCardContent>
                </HoverCard>
            );

        case 'Hausverein':
            return (
                <HoverCard>
                    <HoverCardTrigger asChild>
                        <div className={cn('flex aspect-square size-10 shrink-0 items-center justify-center rounded-lg', className)}>
                            <Image src="/logo_ev.png" alt="Hausverein" width={120} height={120} />
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                        <div className="flex justify-between space-x-4">
                            <Avatar className="rounded-none!">
                                <AvatarImage src="/logo_gmbh.png" alt="Avatar" />
                                <AvatarFallback>GmbH</AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <h4 className="font-semibold">Der Hausverein</h4>
                                <p>
                                    Der Hausverein ist alleiniger Gesellschafter der B-Side GmbH. Er wurde ursprünglich nach dem Modell des
                                    Mietshäusersyndikats gegründet. Als Träger und Gründer der B-Side GmbH hatte er vor allem die Funktion,
                                    als Solidaritätszusammenschluss und Selbstverwaltungsorgan der Mieter*innen des Hauses zu dienen.
                                </p>
                                <div className="flex items-center pt-2">
                                    <LinkIcon className="mr-2 size-4 opacity-70" />{' '}
                                    <Link href="https://b-side.ms/bside/traegerschaft" target="_blank">
                                        <span className="text-muted-foreground text-sm">Mehr Informationen</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </HoverCardContent>
                </HoverCard>
            );

        default:
            return (
                <HoverCard>
                    <HoverCardTrigger asChild>
                        <div className={cn('flex aspect-square size-10 shrink-0 items-center justify-center rounded-lg', className)}>
                            <Image src="/logo.png" alt="Kollektiv" width={120} height={120} />
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                        <div className="flex justify-between space-x-4">
                            <Avatar className="rounded-none!">
                                <AvatarImage src="/logo.png" alt="Avatar" />
                                <AvatarFallback>Kollektiv</AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <h4 className="font-semibold">Das Kollektiv</h4>
                                <p>Alle Arbeitsgruppen, die nicht direkt einer Körperschaft zugeordnet sind, gehören zum Kollektiv.</p>
                                <div className="flex items-center pt-2">
                                    <LinkIcon className="mr-2 size-4 opacity-70" />{' '}
                                    <Link href="https://b-side.ms/bside/kollektiv" target="_blank">
                                        <span className="text-muted-foreground text-sm">Mehr Informationen</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </HoverCardContent>
                </HoverCard>
            );
    }
};

export default GroupLogo;
