'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CalendarIcon, CheckCircle2, Loader2 } from 'lucide-react';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
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
    { label: 'Gehen', type: 'stop' },
    { label: 'Pause', type: 'pause' },
    { label: 'Pause: Ende', type: 'pause_end' },
];

const formSchema = z.object({
    eventType: z.enum(['start', 'pause', 'pause_end', 'stop'], {
        errorMap: () => ({ message: 'Ereignis auswählen' }),
    }),
    date: z.date({
        message: 'Gebe ein gültiges Datum ein.',
    }),
    time: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { message: 'Gebe eine gültige Uhrzeit an.' })
        .transform((v) => (v.length === 5 ? `${v}:00` : v)),

    comment: z
        .string()
        .max(500, {
            message: 'Maximal 500 Zeichen erlaubt.',
        })
        .optional(),
});

export default function AdvancedEntry(): ReactElement {
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [pendingValues, setPendingValues] = useState<z.infer<typeof formSchema> | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),

        defaultValues: {
            date: new Date(),
            time: format(new Date(), 'HH:mm'),
            comment: '',
            eventType: undefined,
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>, force = false): Promise<void> => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        if (!force) {
            setWarning(null);
            setPendingValues(null);
        }

        const datePart = format(values.date, 'yyyy-MM-dd');

        const localDateTimeString = `${datePart}T${values.time}`;
        const combinedDate = new Date(localDateTimeString);

        const dateTimeIso = combinedDate.toISOString();

        try {
            const res = await fetch('/api/hrp/advanced', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: values.eventType,
                    timestamp: dateTimeIso,
                    comment: values.comment ?? null,
                    force,
                }),
            });

            const data = await res.json();

            if (data.needsConfirmation) {
                setWarning(data.message);
                setPendingValues(values);
                setIsLoading(false);
                return;
            }

            if (!res.ok || data.success === false) {
                setError(data.message || data.error || 'Es ist ein unbekannter Fehler aufgetreten.');
                return;
            }

            setSuccess(data.message || 'Deine Eintragung wurde erfasst!');
            setWarning(null);
            setPendingValues(null);

            const displayDate = new Date(values.date);
            if (values.eventType !== 'start' && combinedDate.getHours() < 7) {
                displayDate.setDate(displayDate.getDate() - 1);
            }
            window.dispatchEvent(new CustomEvent('hrpEntryAdded', { detail: { date: displayDate } }));
        } catch {
            setError('Es ist ein Fehler aufgetreten.');
        } finally {
            setIsLoading(false);
        }
    };

    // Wrapper function that matches SubmitHandler signature for react-hook-form
    const handleFormSubmit = async (values: z.infer<typeof formSchema>): Promise<void> => {
        await onSubmit(values, false);
    };

    const closeResultModal = (): void => {
        if (success) {
            form.reset({
                date: form.getValues('date'),
                time: format(new Date(), 'HH:mm'),
                comment: '',
                eventType: undefined,
            });
        }
        setError(null);
        setSuccess(null);
        setWarning(null);
        setPendingValues(null);
    };

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
                <Card>
                    <CardHeader className="text-xl underline underline-offset-4">Ausführliche Erfassung</CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="eventType"
                            render={({ field }) => (
                                <FormItem className="flex flex-col my-2">
                                    <FormLabel>Ereignis</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                        <FormControl className="w-[240px]">
                                            <SelectTrigger>
                                                <SelectValue placeholder="Bitte wähle ein Ereignis" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Events.map((event) => (
                                                <SelectItem key={event.type} value={event.type}>
                                                    {event.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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
                                                defaultMonth={field.value}
                                                disabled={(date) => date > tomorrow || date < new Date('2025-01-01')}
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
                                <FormItem className="flex flex-col my-2 w-[240px] ">
                                    <FormLabel className="mt-2">Uhrzeit</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="time"
                                            id="time-picker"
                                            step="60"
                                            {...field}
                                            className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                                        />
                                    </FormControl>
                                    <FormDescription>Die zu erfassende Uhrzeit.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="comment"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Kommentar</FormLabel>
                                    <FormControl>
                                        <Textarea className="resize-none" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Ein optionaler Kommentar zu dieser Zeiteintragung. Maximal 500 Zeichen.
                                    </FormDescription>
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

                    {(error || success || (warning && pendingValues)) && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                            <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl shadow-lg p-6 max-w-sm w-full border border-zinc-200 dark:border-zinc-700">
                                {warning ? (
                                    <>
                                        <div className="flex items-center mb-4 text-lg font-semibold text-amber-600">
                                            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                                            <span>Pausenzeiten-Warnung</span>
                                        </div>
                                        <div className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">{warning}</div>
                                        <div className="mb-4 text-sm text-zinc-600 dark:text-zinc-400 italic">
                                            Möchtest du die Buchung trotzdem speichern?
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button variant="secondary" onClick={closeResultModal}>
                                                Abbrechen
                                            </Button>
                                            <Button variant="destructive" onClick={(): Promise<void> => onSubmit(pendingValues!, true)}>
                                                Trotzdem speichern
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center mb-4 text-lg">
                                            {error ? (
                                                <>
                                                    <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 text-red-500" />
                                                    <span className="">{error}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="h-5 w-5 mr-2 flex-shrink-0 text-green-500" />
                                                    <span className="">{success}</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex justify-end">
                                            <Button variant="secondary" onClick={closeResultModal}>
                                                Schließen
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </Card>
            </form>
        </Form>
    );
}
