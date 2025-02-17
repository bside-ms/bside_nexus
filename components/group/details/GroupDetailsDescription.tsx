import { isEmpty } from 'lodash-es';
import { Edit, ExternalLink, ShieldX, Star, Users } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GroupAdminStatus } from '@/lib/db/groupActions';

interface GroupServicesProps {
    wikiLink: string;
    websiteLink: string;
    description: string;
    isAdmin: GroupAdminStatus;
}

export function GroupDetailsDescription({ wikiLink, websiteLink, description, isAdmin }: GroupServicesProps): ReactElement {
    return (
        <Card className="col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Gruppenbeschreibung</CardTitle>
                <Button size="sm" variant="outline" disabled={true}>
                    <Edit className="mr-2 size-4" />
                    Gruppe bearbeiten
                </Button>
            </CardHeader>
            <CardContent>
                <p>{isEmpty(description) ? 'Diese Gruppe hat aktuell noch keine Beschreibung.' : description}</p>
                <div className="mt-4 flex space-x-4">
                    <Badge variant={isAdmin === 'Admin' ? 'default' : 'secondary'}>
                        {isAdmin === 'Admin' && (
                            <>
                                <Star className="mr-1 size-3" /> Administrator*in
                            </>
                        )}
                        {isAdmin === 'Member' && (
                            <>
                                <Users className="mr-1 size-3" /> Mitglied
                            </>
                        )}
                        {isAdmin === 'None' && (
                            <>
                                <ShieldX className="mr-1 size-3" /> Gast
                            </>
                        )}
                    </Badge>
                    <Link href={wikiLink} className="flex items-center text-sm text-blue-600 hover:underline">
                        Wiki <ExternalLink className="ml-1 size-4" />
                    </Link>
                    <Link href={websiteLink} className="flex items-center text-sm text-blue-600 hover:underline">
                        Website <ExternalLink className="ml-1 size-4" />
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
