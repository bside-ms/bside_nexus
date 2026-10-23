import type { ReactElement } from 'react';
import GroupList from '@/components/group/overview/GroupList';
import { Separator } from '@/components/ui/separator';
import type { GroupOverviewEntry } from '@/lib/groupOverview';

const ArchivedGroups = ({ entries }: { entries: Array<GroupOverviewEntry> }): ReactElement | null => {
    if (entries.length === 0) {
        return null;
    }

    return (
        <>
            <Separator className="my-6" />

            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">Archivierte Gruppen</h2>
                <p>Diese Gruppen sind nicht mehr aktiv. Ihre Informationen und Mitglieder findest du hier weiterhin.</p>
            </div>

            <GroupList entries={entries} emptyText="" />
        </>
    );
};

export default ArchivedGroups;
