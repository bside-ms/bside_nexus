'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, Loader2 } from 'lucide-react';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

type EventType = 'start' | 'pause' | 'pause_end' | 'stop';

interface EventOption {
    label: string;
    type: EventType;
}

const Events: Array<EventOption> = [
    { label: 'Kommen', type: 'start' },
    { label: 'Pause', type: 'pause' },
    { label: 'Pause: Ende', type: 'pause_end' },
    { label: 'Gehen', type: 'stop' },
];

const formSchema = z.object({
    eventType: z.enum(['start', 'pause', 'pause_end', 'stop'], {
        errorMap: () => ({ message: 'Ereignis auswählen' }),
    }),
    date: z.date({
        message: 'Gebe ein gültiges Datum ein.',
    }),
    time: z.string().time({
        message: 'Gebe eine gültige Uhrzeit an.',
    }),
    approver: z.string().min(1, 'Eintrag erforderlich'),
    comment: z.string().optional(),
});

export default function AdvancedEntry(): ReactElement {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),

        defaultValues: {
            date: new Date(),
            time: format(new Date(), 'pp', { locale: de }),
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>): Promise<void> => {
        console.log(values);
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
        }, 2000);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader className="text-xl underline underline-offset-4">Ausführliche Erfassung</CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="date"
                            // eslint-disable-next-line react/jsx-no-bind
                            render={({ field }) => (
                                <FormItem className="flex flex-col my-2">
                                    <FormLabel>Datum</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        'w-[240px] pl-3 text-left font-normal',
                                                        !field.value && 'text-muted-foreground',
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, 'PPP', { locale: de })
                                                    ) : (
                                                        <span>Wähle ein Datum</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) => date > new Date() || date < new Date('2025-01-01')}
                                                captionLayout="dropdown"
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormDescription>Das zu erfassende Datum.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="time"
                            render={({ field }) => (
                                <FormItem className="flex flex-col my-2">
                                    <FormLabel className="mt-2">Uhrzeit</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="time"
                                            id="time-picker"
                                            step="1"
                                            defaultValue={field.value}
                                            className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                                        />
                                    </FormControl>
                                    <FormDescription>Die zu erfassende Uhrzeit.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <Loader2 className="size-4 animate-spin" />
                                    <span>Lädt...</span>
                                </div>
                            ) : (
                                'Speichern'
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
