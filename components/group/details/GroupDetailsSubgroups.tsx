import { PlusCircle, Users } from 'lucide-react';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Group } from '@/db/schema';
import getUserSession from '@/lib/auth/getUserSession';
import { isSubGroupMember } from '@/lib/db/groupActions';
import { hiddenSubGroups } from '@/lib/groups';

export async function GroupDetailsSubgroups({ subgroups }: { subgroups: Array<Group> }): Promise<ReactElement> {
    const user = await getUserSession();

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Untergruppen</CardTitle>
                <Button size="sm" variant="outline" disabled={true}>
                    <PlusCircle className="mr-2 size-4" />
                    Untergruppe erstellen
                </Button>
            </CardHeader>
            <CardContent>
                <CardDescription className="mb-4">Liste der Untergruppen innerhalb dieser Gruppe</CardDescription>
                <ul className="space-y-2">
                    {subgroups.length > 0 &&
                        subgroups.map(async (subgroup) => {
                            const displayName =
                                hiddenSubGroups.includes(`${subgroup.id}`) && !(await isSubGroupMember(user?.id ?? '', subgroup.id ?? ''))
                                    ? '(Geschützte Gruppe)'
                                    : subgroup.displayName;

                            return (
                                <li key={subgroup.id} className="flex items-center space-x-2">
                                    <Users className="size-4" />
                                    <span>{displayName}</span>
                                </li>
                            );
                        })}
                    {subgroups.length <= 0 && (
                        <li key="none" className="flex items-center space-x-2">
                            <Users className="size-4" />
                            <span>Diese Gruppe hat keine Untergruppen.</span>
                        </li>
                    )}
                </ul>
            </CardContent>
        </Card>
    );
}
