import type { ReactElement } from 'react';

export function GroupDetailsHeader({ displayName }: { displayName: string }): ReactElement {
    return (
        <div className="space-y-0.5">
            <h2 className="text-2xl font-bold tracking-tight">Gruppenverwaltung: {displayName}</h2>
            <p>Auf dieser Seite findest du alle Informationen zu dieser Gruppe.</p>
        </div>
    );
}
