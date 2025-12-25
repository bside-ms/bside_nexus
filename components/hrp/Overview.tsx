/* eslint-disable react/jsx-no-bind */
'use client';

import { useEffect, useState } from 'react';
import { isEmpty } from 'lodash-es';
import { Trash2 } from 'lucide-react';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { HrpEventLogEntry } from '@/db/schema';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

async function fetchDates(year: number, month: number): Promise<Array<Date>> {
    const res = await fetch('/api/hrp/dates', {
        method: 'POST',
        body: JSON.stringify({ year, month }),
        headers: { 'Content-Type': 'application/json' },
    });

    const resJson = await res.json();
    if (!resJson.success || !resJson.dates || !Array.isArray(resJson.dates)) {
        return [];
    }

    const dates: Array<Date> = resJson.dates.map((dateString: string) => {
        const date = new Date(dateString);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    });

    return dates;
}

async function fetchEntries(year: number, month: number, day: number): Promise<Array<Partial<HrpEventLogEntry>>> {
    const res = await fetch('/api/hrp/entries', {
        method: 'POST',
        body: JSON.stringify({ year, month, day }),
        headers: { 'Content-Type': 'application/json' },
    });

    const resJson = await res.json();
    if (!resJson.success || !resJson.entries || !Array.isArray(resJson.entries)) {
        return [];
    }

    // @ts-expect-error resJson.entries is not typed
    const entries: Array<Partial<HrpEventLogEntry>> = resJson.entries.map((entry) => {
        entry.loggedTimestamp = new Date(entry.loggedTimestamp);
        return entry;
    });

    return entries;
}

const parseEntryType = (entryType: string): string => {
    switch (entryType) {
        case 'start':
            return 'Kommen';
        case 'stop':
            return 'Gehen';
        case 'pause':
            return 'Pause';
        case 'pause_end':
            return 'Pause: Ende';
        default:
            return entryType;
    }
};

export default function Overview(): ReactElement {
    const [isLoading, setIsLoading] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
    const [datesWithHrpEntries, setDatesWithHrpEntries] = useState<Array<Date>>([]);
    const [hrpEntries, setHrpEntries] = useState<Array<Partial<HrpEventLogEntry>>>([]);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
    const [deleteReason, setDeleteReason] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const [date, setDate] = useState<Date | undefined>(new Date());
    const today = new Date();

    const handleDelete = async (): Promise<void> => {
        if (!entryToDelete || !deleteReason.trim()) {
            return;
        }
        setIsDeleting(true);
        try {
            const res = await fetch('/api/hrp/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: entryToDelete, reason: deleteReason }),
            });
            if (res.ok) {
                // Refresh entries
                const result = await fetchEntries(
                    date?.getFullYear() ?? today.getFullYear(),
                    date?.getMonth() ?? today.getMonth(),
                    date?.getDate() ?? today.getDate(),
                );
                setHrpEntries(result);
                // Refresh dates with entries
                const datesResult = await fetchDates(calendarMonth.getFullYear(), calendarMonth.getMonth());
                setDatesWithHrpEntries(datesResult);

                setDeleteModalOpen(false);
                setEntryToDelete(null);
                setDeleteReason('');
            } else {
                const data = await res.json();
                alert(data.message || 'Fehler beim Löschen');
            }
        } catch {
            alert('Es ist ein Fehler aufgetreten.');
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        async function loadData(): Promise<void> {
            setIsLoading(true);
            const result = await fetchDates(calendarMonth.getFullYear(), calendarMonth.getMonth());

            setDatesWithHrpEntries(result);
            setIsLoading(false);
        }
        loadData();
    }, [calendarMonth]);

    useEffect(() => {
        async function loadData(): Promise<void> {
            setIsLoading(true);
            const result = await fetchEntries(
                date?.getFullYear() ?? today.getFullYear(),
                date?.getMonth() ?? today.getMonth(),
                date?.getDate() ?? today.getDate(),
            );
            setHrpEntries(result);
            setIsLoading(false);
        }
        loadData();
    }, [date]);

    useEffect(() => {
        const handleEntryAdded = (event: CustomEvent<{ date: Date }>): void => {
            const newDate = event.detail.date;
            setDate(newDate);
            setCalendarMonth(newDate);
        };

        window.addEventListener('hrpEntryAdded', handleEntryAdded as EventListener);

        return () => {
            window.removeEventListener('hrpEntryAdded', handleEntryAdded as EventListener);
        };
    }, []);

    function handleMonthChange(newMonth: Date): void {
        setCalendarMonth(newMonth);
    }

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
            <Card className="lg:col-span-5 xl:col-span-4">
                <CardContent className="p-0">
                    <div className="p-4 sm:p-6">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            month={calendarMonth}
                            onMonthChange={handleMonthChange}
                            disabled={false}
                            showOutsideDays={true}
                            modifiers={{
                                bookings: datesWithHrpEntries,
                            }}
                            modifiersClassNames={{
                                bookings: 'bg-blue-300 text-black rounded-2xl',
                            }}
                            className="mx-auto bg-transparent p-0 [--cell-size:--spacing(9)] sm:[--cell-size:--spacing(10)] md:[--cell-size:--spacing(11)] lg:[--cell-size:--spacing(10)] xl:[--cell-size:--spacing(12)]"
                            classNames={{
                                today: 'bg-green-300 text-black rounded-2xl',
                                outside: 'text-zinc-500',
                            }}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="lg:col-span-7 xl:col-span-8">
                <CardHeader className="text-xl underline underline-offset-4">
                    Zeitbuchungen am{' '}
                    {date?.toLocaleDateString('de-DE', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                    })}
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {isLoading && (
                            <div className="bg-zinc-100/50 relative rounded-lg p-4 pl-8 text-sm after:absolute after:inset-y-4 after:left-4 after:w-1 after:rounded-full after:bg-zinc-300">
                                Lade Einträge...
                            </div>
                        )}
                        {!isLoading && hrpEntries.length === 0 && (
                            <div className="bg-zinc-100/50 relative rounded-lg p-4 pl-8 text-sm after:absolute after:inset-y-4 after:left-4 after:w-1 after:rounded-full after:bg-zinc-300">
                                Keine Einträge für diesen Tag
                            </div>
                        )}
                        {!isLoading &&
                            hrpEntries.length > 0 &&
                            [...hrpEntries]
                                .sort((a, b) => {
                                    const aDeleted = !!a.deletedAt;
                                    const bDeleted = !!b.deletedAt;
                                    if (aDeleted !== bDeleted) {
                                        return aDeleted ? 1 : -1;
                                    }
                                    return (a.loggedTimestamp?.getTime() ?? 0) - (b.loggedTimestamp?.getTime() ?? 0);
                                })
                                .map((event) => (
                                    <div
                                        key={event.id}
                                        className={`relative rounded-lg p-3 sm:p-4 pl-8 sm:pl-10 text-sm after:absolute after:inset-y-4 after:left-4 after:w-1 after:rounded-full transition-colors ${
                                            event.deletedAt
                                                ? 'bg-zinc-50 text-muted-foreground opacity-70 after:bg-zinc-300 italic'
                                                : 'bg-zinc-100/80 hover:bg-zinc-100 after:bg-green-500/50 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-medium text-base sm:text-sm">
                                                    {parseEntryType(event.entryType!)}
                                                    {event.deletedAt && (
                                                        <span className="ml-2 text-[10px] font-normal text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 uppercase not-italic">
                                                            Gelöscht
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-muted-foreground text-xs sm:text-sm">
                                                    {format(event.loggedTimestamp!, 'PP - pp', { locale: de })}
                                                </div>
                                            </div>
                                            {!event.abgerechnet && !event.deletedAt && (
                                                <button
                                                    onClick={(): void => {
                                                        setEntryToDelete(event.id!);
                                                        setDeleteModalOpen(true);
                                                    }}
                                                    className="text-red-500 hover:text-red-700 p-2 -mr-2 -mt-1 sm:p-1 sm:mr-0 sm:mt-0 transition-colors"
                                                    title="Eintrag löschen"
                                                >
                                                    <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
                                                </button>
                                            )}
                                        </div>
                                        {!isEmpty(event.comment) && (
                                            <div className="text-muted-foreground mt-2 text-xs sm:text-sm bg-white/50 p-2 rounded-md border border-zinc-200/50">
                                                <span className="font-semibold text-[10px] uppercase block mb-1 opacity-70">Kommentar</span>
                                                {event.comment}
                                            </div>
                                        )}
                                        {event.deletedAt && !isEmpty(event.deletionReason) && (
                                            <div className="text-red-500/80 mt-2 text-xs bg-red-50/50 p-2 rounded-md border border-red-200/30">
                                                <span className="font-semibold text-[10px] uppercase block mb-1 opacity-70">
                                                    Löschgrund
                                                </span>
                                                {event.deletionReason}
                                            </div>
                                        )}
                                    </div>
                                ))}
                    </div>
                </CardContent>
            </Card>

            {deleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl shadow-lg p-6 max-w-sm w-full border border-zinc-200 dark:border-zinc-700">
                        <div className="mb-4 text-lg font-semibold">Eintrag löschen</div>
                        <div className="mb-4 text-sm">
                            Bitte gib eine Begründung für das Löschen dieses Eintrags ein. Der Eintrag wird nur als gelöscht markiert.
                        </div>
                        <Textarea
                            placeholder="Begründung..."
                            value={deleteReason}
                            onChange={(e): void => setDeleteReason(e.target.value)}
                            className="mb-4"
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={(): void => setDeleteModalOpen(false)} disabled={isDeleting}>
                                Abbrechen
                            </Button>
                            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting || !deleteReason.trim()}>
                                {isDeleting ? 'Löscht...' : 'Löschen'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
