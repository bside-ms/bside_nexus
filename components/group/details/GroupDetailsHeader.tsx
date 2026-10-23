import { Archive, Info } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { Group } from '@/db/schema';
import { MATTERMOST_SUPPORT_CHANNEL_URL } from '@/lib/constants';

interface GroupDetailsHeaderProps {
    displayName: string;
    isPermission: boolean;
    // Only set if the user may see the parent group.
    parent: Group | null;
    isLegacySubgroup: boolean;
    isArchived: boolean;
}

export function GroupDetailsHeader({
    displayName,
    isPermission,
    parent,
    isLegacySubgroup,
    isArchived,
}: GroupDetailsHeaderProps): ReactElement {
    return (
        <div className="space-y-4">
            <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold tracking-tight">Gruppenverwaltung: {displayName}</h2>
                    {isPermission && <Badge variant="outline">Berechtigung</Badge>}
                    {isArchived && <Badge variant="secondary">Archiviert</Badge>}
                </div>
                <p>Auf dieser Seite findest du alle Informationen zu dieser Gruppe.</p>
                {parent !== null && (
                    <p>
                        Untergruppe von{' '}
                        <Link href={`/portal/groups/${parent.id}`} className="font-medium underline underline-offset-4">
                            {parent.displayName}
                        </Link>
                        . Die Mitgliedschaft ist unabhängig von der Obergruppe.
                    </p>
                )}
            </div>

            {isArchived && (
                <Alert>
                    <Archive />
                    <AlertTitle>Archiviert</AlertTitle>
                    <AlertDescription>
                        <p>Diese Gruppe ist nicht mehr aktiv. Ihre Informationen und Mitglieder bleiben hier sichtbar.</p>
                    </AlertDescription>
                </Alert>
            )}

            {isLegacySubgroup && (
                <Alert>
                    <Info />
                    <AlertTitle>Wird noch zentral verwaltet</AlertTitle>
                    <AlertDescription>
                        <p>
                            Diese Untergruppe ist noch nicht auf die neue Gruppenstruktur umgestellt. Mitglieder können deshalb hier nicht
                            geändert werden. Wende dich für Änderungen an den{' '}
                            <Link href={MATTERMOST_SUPPORT_CHANNEL_URL} target="_blank" className="underline underline-offset-4">
                                IT-Kanal
                            </Link>
                            .
                        </p>
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
