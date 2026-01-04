'use client';

import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { HrpAbsenceEntry } from '@/db/schema';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

export default function AbsenceOverview(): ReactElement {
    const [upcoming, setUpcoming] = useState<Array<HrpAbsenceEntry>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const fetchUpcoming = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/hrp/absences/manage');
            const data = await res.json();
            if (data.success) {
                setUpcoming(data.upcoming);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUpcoming();
    }, []);

    const handleDeleteGroup = async (date: string) => {
        // Find consecutive dates in the 'upcoming' list that include 'date'.
        const sortedUpcoming = [...upcoming].sort((a, b) => a.date.localeCompare(b.date));
        const targetIndex = sortedUpcoming.findIndex((a) => a.date === date);
        const targetEntry = sortedUpcoming[targetIndex];
        if (targetIndex === -1 || !targetEntry) {
            return;
        }

        const idsToDelete = [targetEntry.id];

        // Look forward
        let current = parseISO(targetEntry.date);
        for (let i = targetIndex + 1; i < sortedUpcoming.length; i++) {
            const entry = sortedUpcoming[i];
            if (!entry) {
                break;
            }
            const next = parseISO(entry.date);
            const diff = Math.abs(next.getTime() - current.getTime()) / (1000 * 60 * 60 * 24);
            if (diff <= 1) {
                idsToDelete.push(entry.id);
                current = next;
            } else {
                break;
            }
        }

        // Look backward
        current = parseISO(targetEntry.date);
        for (let i = targetIndex - 1; i >= 0; i--) {
            const entry = sortedUpcoming[i];
            if (!entry) {
                break;
            }
            const prev = parseISO(entry.date);
            const diff = Math.abs(current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
            if (diff <= 1) {
                idsToDelete.push(entry.id);
                current = prev;
            } else {
                break;
            }
        }

        if (!confirm(`Möchtest du diese ${idsToDelete.length} zusammenhängenden Urlaubstage wirklich löschen?`)) {
            return;
        }

        setIsDeleting(date);
        try {
            const res = await fetch('/api/hrp/absences/manage', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: idsToDelete, reason: 'Bulk delete from overview' }),
            });
            if (res.ok) {
                await fetchUpcoming();
            }
        } finally {
            setIsDeleting(null);
        }
    };

    // Grouping for display
    const groups: Array<{ startDate: string; endDate: string; count: number; ids: Array<string> }> = [];
    if (upcoming.length > 0) {
        const sorted = [...upcoming].sort((a, b) => a.date.localeCompare(b.date));
        let currentGroup: (typeof groups)[0] | null = null;

        for (const entry of sorted) {
            const entryDate = parseISO(entry.date);
            if (!currentGroup) {
                currentGroup = { startDate: entry.date, endDate: entry.date, count: 1, ids: [entry.id] };
            } else {
                const lastDate = parseISO(currentGroup.endDate);
                const diff = (entryDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
                if (diff <= 1) {
                    currentGroup.endDate = entry.date;
                    currentGroup.count++;
                    currentGroup.ids.push(entry.id);
                } else {
                    groups.push(currentGroup);
                    currentGroup = { startDate: entry.date, endDate: entry.date, count: 1, ids: [entry.id] };
                }
            }
        }
        if (currentGroup) {
            groups.push(currentGroup);
        }
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-lg">Kommende Urlaube</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Keine kommenden Urlaube geplant.</p>
                ) : (
                    <ul className="space-y-3">
                        {groups.map((group) => (
                            <li key={group.startDate} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm">
                                        {group.startDate === group.endDate
                                            ? format(parseISO(group.startDate), 'dd.MM.yyyy', { locale: de })
                                            : `${format(parseISO(group.startDate), 'dd.MM.yyyy', { locale: de })} - ${format(parseISO(group.endDate), 'dd.MM.yyyy', { locale: de })}`}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {group.count} Tag{group.count > 1 ? 'e' : ''} Urlaub
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDeleteGroup(group.startDate)}
                                    disabled={isDeleting === group.startDate}
                                >
                                    {isDeleting === group.startDate ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
