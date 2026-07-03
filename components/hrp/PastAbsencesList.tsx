'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { ReactElement } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { HrpAbsenceEntry } from '@/db/schema';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

const ABSENCE_TYPE_MAP = {
    vacation: 'Urlaub',
    sick: 'Krankmeldung',
    sick_with: 'Krankmeldung (mit Attest)',
    compensatory_day: 'Freizeitausgleich',
    holiday: 'Feiertag',
};

export default function PastAbsencesList(): ReactElement {
    const [absences, setAbsences] = useState<Array<HrpAbsenceEntry>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        vacation: true,
        sick: false,
        sick_with: false,
    });

    useEffect(() => {
        const fetchPastAbsences = async () => {
            setIsLoading(true);
            try {
                const res = await fetch('/api/hrp/absences/manage?period=past');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setAbsences(data.past);
                    }
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchPastAbsences();
    }, []);

    const handleFilterChange = (filterName: keyof typeof filters) => {
        setFilters((prev) => ({ ...prev, [filterName]: !prev[filterName] }));
    };

    const filteredAbsences = useMemo(() => {
        return absences.filter((absence) => {
            const type = absence.type as keyof typeof filters;
            return filters[type];
        });
    }, [absences, filters]);

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-lg">Vergangene Abwesenheiten</CardTitle>
                <div className="flex items-center space-x-4 pt-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="filter-vacation" checked={filters.vacation} onCheckedChange={() => handleFilterChange('vacation')} />
                        <Label htmlFor="filter-vacation">Urlaub</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="filter-sick" checked={filters.sick} onCheckedChange={() => handleFilterChange('sick')} />
                        <Label htmlFor="filter-sick">Krank</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="filter-sick_with"
                            checked={filters.sick_with}
                            onCheckedChange={() => handleFilterChange('sick_with')}
                        />
                        <Label htmlFor="filter-sick_with">Krankmeldung (mit Attest)</Label>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : filteredAbsences.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Keine Einträge für die gewählten Filter gefunden.</p>
                ) : (
                    <ul className="space-y-2">
                        {filteredAbsences.map((absence) => (
                            <li key={absence.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg border text-sm">
                                <span>
                                    {format(parseISO(absence.date), 'dd.MM.yyyy', {
                                        locale: de,
                                    })}
                                </span>
                                <span>{ABSENCE_TYPE_MAP[absence.type as keyof typeof ABSENCE_TYPE_MAP] ?? absence.type}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
