import { Archive } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { Group } from '@/db/schema';

interface GroupDetailsHeaderProps {
    displayName: string;
    isPermission: boolean;
    // Only set if the user may see the parent group.
    parent: Group | null;
    isArchived: boolean;
    // Shown next to the title.
    actions?: ReactNode;
}

export function GroupDetailsHeader({ displayName, isPermission, parent, isArchived, actions }: GroupDetailsHeaderProps): ReactElement {
    return (
        <div className="space-y-4">
            <div className="space-y-0.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold tracking-tight">Gruppenverwaltung: {displayName}</h2>
                        {isPermission && <Badge variant="outline">Berechtigung</Badge>}
                        {isArchived && <Badge variant="secondary">Archiviert</Badge>}
                    </div>
                    {actions}
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
        </div>
    );
}
