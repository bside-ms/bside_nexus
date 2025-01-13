import { ArrowRight, FolderTree, Star, Users } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { AugmentedGroupRepresentation } from '@/lib/keycloak/groupActions';
import type { AugmentedUserRepresentation } from '@/lib/keycloak/userActions';

const GroupLogo = ({ group }: { group: AugmentedGroupRepresentation }): ReactElement | null => {
    const { categoryName } = group.attributes;

    if (categoryName === undefined) {
        return null;
    }

    switch (categoryName) {
        case 'Kulturverein':
            return (
                <div className="text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-950">
                    KV
                </div>
            );

        case 'GmbH':
            return (
                <div className="text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg bg-red-950">G</div>
            );

        default:
            return (
                <div className="text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg bg-green-950">
                    K
                </div>
            );
    }
};

// const FORBIDDEN_GROUP_NAMES = ['admin', 'eingeschränkt', 'erweitert', 'mitglieder'];

const GroupMembers = ({ group, isAdmin }: { group: AugmentedGroupRepresentation; isAdmin: boolean }): ReactElement => {
    // const groupMembersResponse = await getGroupMembers(group);
    // const groupMembers = groupMembersResponse[1];

    // const userGroups = await getUserGroups();
    // let subGroups = await getSubGroupsByGroup(group);
    // const adminGroup = subGroups.find((subGroup) => subGroup.name === 'admin');
    // const isAdmin = userGroups.some((userGroup) => userGroup.id === adminGroup?.id);
    // subGroups = subGroups.filter((subGroup) => !FORBIDDEN_GROUP_NAMES.includes(subGroup.name));
    // ToDo: Make this performant and then enable it.

    const subGroups: Array<AugmentedGroupRepresentation> = [];
    const groupMembers: Array<AugmentedUserRepresentation> = [];

    return (
        <Card className="flex h-full flex-col justify-between rounded-xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>{group.attributes.displayName}</CardTitle>
                    <GroupLogo group={group} />
                </div>
                <CardDescription>
                    {group.attributes.description ?? 'Lorem Ipsum'}
                    <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                            <Users className="size-3" />
                            <span>{groupMembers?.length ?? 0}</span>
                        </Badge>
                        <Badge variant={isAdmin ? 'default' : 'secondary'}>
                            {isAdmin ? (
                                <>
                                    <Star className="mr-1 size-3" /> Administrator*in
                                </>
                            ) : (
                                <>
                                    <Users className="mr-1 size-3" /> Mitglied
                                </>
                            )}
                        </Badge>
                    </div>
                </CardDescription>
            </CardHeader>
            <CardContent className="grid flex-1 gap-6">
                {subGroups && subGroups.length > 0 && (
                    <div className="mt-2">
                        <div className="mb-1 flex items-center">
                            <FolderTree className="mr-1 size-4" />
                            <span className="text-sm font-medium">Untergruppen:</span>
                        </div>
                        <ul className="text-muted-foreground list-inside list-disc text-sm">
                            {subGroups.map((subGroup) => (
                                <li key={subGroup.id}>{subGroup.attributes.displayName}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-2">
                <Link className="w-full" href={`/groups/${group.id}`}>
                    <Button size="sm" variant="outline" className="w-full">
                        View Details
                        <ArrowRight className="ml-2 size-4" />
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );
};

export default GroupMembers;
