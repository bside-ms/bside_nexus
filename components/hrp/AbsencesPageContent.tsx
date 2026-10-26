'use client';

import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import AbsenceEntry from '@/components/hrp/AbsenceEntry';
import PastAbsencesList from '@/components/hrp/PastAbsencesList';
import UpcomingAbsencesList from '@/components/hrp/UpcomingAbsencesList';
import VacationOverview from '@/components/hrp/VacationOverview';
import type { HrpContract } from '@/lib/db/contractActions';

// Shared refresh key so that saving or deleting an absence reloads all lists on the page.
export default function AbsencesPageContent({ contracts }: { contracts: Array<HrpContract> }): ReactElement {
    const [refreshKey, setRefreshKey] = useState(0);

    const handleAbsencesChanged = useCallback((): void => {
        setRefreshKey((key) => key + 1);
    }, []);

    return (
        <>
            <VacationOverview refreshKey={refreshKey} />
            <AbsenceEntry contracts={contracts} onSaved={handleAbsencesChanged} />
            <UpcomingAbsencesList refreshKey={refreshKey} onChanged={handleAbsencesChanged} />
            <PastAbsencesList refreshKey={refreshKey} />
        </>
    );
}
