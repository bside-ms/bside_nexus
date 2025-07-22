'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function Overview(): ReactElement {
    const [isLoading, setIsLoading] = useState(false);

    const [date, setDate] = useState<Date | undefined>(new Date());

    const daysWithBookings = [new Date(2025, 6, 12), new Date(2025, 6, 19)];

    const events = [
        {
            title: 'Kommen',
            from: '2025-06-12T09:00:00',
        },
        {
            title: 'Pause',
            from: '2025-06-12T14:00:00',
        },
        {
            title: 'Pause: Ende',
            from: '2025-06-12T14:00:00',
        },
        {
            title: 'Gehen',
            from: '2025-06-12T14:00:00',
            comment: 'Viel los heute.',
        },
    ];

    return (
        <div className="grid auto-rows-min gap-4 md:grid-cols-2">
            <Card className="">
                <CardContent className="relative p-0">
                    <div className="p-6">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            defaultMonth={date}
                            disabled={false}
                            showOutsideDays={true}
                            modifiers={{
                                bookings: daysWithBookings,
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

            <Card className="gap-0 p-0">
                <CardHeader className="text-lg">
                    {date?.toLocaleDateString('de-DE', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                    })}
                </CardHeader>
                <CardContent className="relative p-0">
                    <div className="flex w-[480px] flex-col gap-2">
                        {events.length === 0 && <p>Keine Einträge</p>}
                        {events.length > 0 &&
                            events.map((event) => (
                                <div
                                    key={event.title}
                                    className="mx-2 bg-gray-100 after:bg-green-300/70 relative rounded-md p-2 pl-6 text-sm after:absolute after:inset-y-2 after:left-2 after:w-1 after:rounded-full"
                                >
                                    <div className="font-medium">{event.title}</div>
                                    <div className="text-muted-foreground">{format(Date.parse(event.from), 'pp', { locale: de })}</div>
                                    {event.comment && <div className="text-muted-foreground mt-2">Kommentar: {event.comment}</div>}
                                </div>
                            ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
