import { isEmpty } from 'lodash-es';
import { ArrowRight, FolderTree, LinkIcon, Star, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import type { Group } from '@/db/schema';
import getUserSession from '@/lib/auth/getUserSession';
import { getGroupAdminStatus, getGroupMemberCount, getSubgroups } from '@/lib/db/groupActions';

const GroupLogo = ({ group }: { group: Group }): ReactElement | null => {
    const { categoryName } = group;

    if (categoryName === undefined) {
        return null;
    }

    switch (categoryName) {
        case 'Kulturverein':
            return (
                <HoverCard>
                    <HoverCardTrigger asChild>
                        <div className="flex aspect-square size-10 items-center justify-center rounded-lg">
                            <Image src="/logo_kv.png" alt="KV" width={120} height={120} />
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                        <div className="flex justify-between space-x-4">
                            <Avatar className="!rounded-none">
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
                                        <span className="text-muted text-sm">Mehr Informationen</span>
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
                        <div className="flex aspect-square size-10 items-center justify-center rounded-lg">
                            <Image src="/logo_gmbh.png" alt="GmbH" width={120} height={120} />
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                        <div className="flex justify-between space-x-4">
                            <Avatar className="!rounded-none">
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
                                        <span className="text-muted text-sm">Mehr Informationen</span>
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
                        <div className="flex aspect-square size-10 items-center justify-center rounded-lg">
                            <Image src="/logo_ev.png" alt="Hausverein" width={120} height={120} />
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                        <div className="flex justify-between space-x-4">
                            <Avatar className="!rounded-none">
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
                                        <span className="text-muted text-sm">Mehr Informationen</span>
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
                        <div className="flex aspect-square size-10 items-center justify-center rounded-lg">
                            <Image src="/logo.png" alt="Kollektiv" width={120} height={120} />
                        </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                        <div className="flex justify-between space-x-4">
                            <Avatar className="!rounded-none">
                                <AvatarImage src="/logo.png" alt="Avatar" />
                                <AvatarFallback>Kollektiv</AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <h4 className="font-semibold">Das Kollektiv</h4>
                                <p>Alle Arbeitsgruppen, die nicht direkt einer Körperschaft zugeordnet sind, gehören zum Kollektiv.</p>
                                <div className="flex items-center pt-2">
                                    <LinkIcon className="mr-2 size-4 opacity-70" />{' '}
                                    <Link href="https://b-side.ms/bside/kollektiv" target="_blank">
                                        <span className="text-muted text-sm">Mehr Informationen</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </HoverCardContent>
                </HoverCard>
            );
    }
};

const GroupOverviewCard = async ({ group }: { group: Group }): Promise<ReactElement> => {
    const user = await getUserSession();

    const isAdmin = await getGroupAdminStatus(user?.id ?? '', group.id);
    const memberCount = await getGroupMemberCount(group.id);
    const subGroups: Array<Group> = await getSubgroups(group.id);

    return (
        <Card className="flex h-full flex-col justify-between rounded-xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>{group.displayName}</CardTitle>
                    <GroupLogo group={group} />
                </div>
                <CardDescription className="text-base">
                    <div className=" flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                            <Users className="size-3" />
                            <span>{memberCount}</span>
                        </Badge>
                        {isAdmin !== 'None' && (
                            <Badge variant={isAdmin === 'Admin' ? 'default' : 'secondary'} className="">
                                {isAdmin === 'Admin' ? (
                                    <>
                                        <Star className="mr-1 size-3" /> Administrator*in
                                    </>
                                ) : (
                                    <>
                                        <Users className="mr-1 size-3" /> Mitglied
                                    </>
                                )}
                            </Badge>
                        )}
                    </div>
                </CardDescription>
            </CardHeader>

            {!isEmpty(group.description) && <CardContent>{group.description}</CardContent>}

            {subGroups && subGroups.length > 0 && (
                <CardContent className="grid flex-1 gap-6">
                    <div>
                        <div className="mb-1 flex items-center">
                            <FolderTree className="mr-1 size-4" />
                            <span className="font-semibold">Untergruppen:</span>
                        </div>
                        <ul className="list-inside list-disc">
                            {subGroups.map((subGroup) => (
                                <li key={subGroup.id}>{subGroup.displayName}</li>
                            ))}
                        </ul>
                    </div>
                </CardContent>
            )}

            <CardFooter className="pt-2">
                <Link className="w-full" href={`/groups/${group.id}`}>
                    <Button size="default" variant="outline" className="w-full text-base">
                        Zu den Gruppendetails
                        <ArrowRight className="ml-2 size-4" />
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );
};

export default GroupOverviewCard;
