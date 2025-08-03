/* eslint-disable react/jsx-no-bind */
'use client';

import { useEffect, useState } from 'react';
import { isEmpty } from 'lodash-es';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

    const [date, setDate] = useState<Date | undefined>(new Date());
    const today = new Date();

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
        <div className="grid auto-rows-min gap-2 xl:gap-4 xl:grid-cols-3">
            <Card className="col-span-2 2xl:col-span-1">
                <CardContent className="relative p-0">
                    <div className="p-6">
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
                            className=" mx-auto bg-transparent p-0 [--cell-size:--spacing(10)] md:[--cell-size:--spacing(12)]"
                            classNames={{
                                today: 'bg-green-300 text-black rounded-2xl',
                                outside: 'text-zinc-500',
                            }}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="text-xl underline underline-offset-4 col-span-3">
                    Zeitbuchungen am{' '}
                    {date?.toLocaleDateString('de-DE', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                    })}
                </CardHeader>
                <CardContent>
                    <div className=" gap-2">
                        {isLoading && (
                            <div className="bg-gray-100 after:bg-gray-300/70 relative rounded-md p-2 pl-6 text-sm after:absolute after:inset-y-2 after:left-2 after:w-1 after:rounded-full">
                                Lade Einträge...
                            </div>
                        )}
                        {!isLoading && hrpEntries.length === 0 && (
                            <div className="bg-gray-100 after:bg-gray-300/70 relative rounded-md p-2 pl-6 text-sm after:absolute after:inset-y-2 after:left-2 after:w-1 after:rounded-full">
                                Keine Einträge für diesen Tag
                            </div>
                        )}
                        {!isLoading &&
                            hrpEntries.length > 0 &&
                            hrpEntries.map((event) => (
                                <div
                                    key={event.id}
                                    className="bg-gray-100 after:bg-green-300/70 relative rounded-md p-2 pl-6 text-sm after:absolute after:inset-y-2 after:left-2 after:w-1 after:rounded-full"
                                >
                                    <div className="font-medium">{parseEntryType(event.entryType!)}</div>
                                    <div className="text-muted-foreground">{format(event.loggedTimestamp!, 'PP - pp', { locale: de })}</div>
                                    {!isEmpty(event.comment) && (
                                        <div className="text-muted-foreground mt-2">Kommentar: {event.comment}</div>
                                    )}
                                </div>
                            ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="">
                <CardHeader className="text-xl underline underline-offset-4">Mögliche Probleme</CardHeader>
                <CardContent className="">
                    <p>
                        Sollten irgendwelche Probleme auftreten, trage die Arbeitszeiten bitte über das alte Excel-Dokument ein und&nbsp;
                        <Link className="underline" href="mailto:it@b-side.ms">
                            schreibe eine kurze Mail unsere IT
                        </Link>
                        &nbsp;damit sie sich das Problem anschauen können.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
