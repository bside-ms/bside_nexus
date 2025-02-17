import { PlusCircle, Users } from 'lucide-react';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Group } from '@/db/schema';

export function GroupDetailsSubgroups({ subgroups }: { subgroups: Array<Group> }): ReactElement {
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
                        subgroups.map((subgroup) => (
                            <li key={subgroup.id} className="flex items-center space-x-2">
                                <Users className="size-4" />
                                <span>{subgroup.displayName}</span>
                            </li>
                        ))}
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
