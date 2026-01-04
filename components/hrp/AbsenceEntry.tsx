/* eslint-disable react/jsx-no-bind */

'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CalendarIcon, CheckCircle2, Loader2 } from 'lucide-react';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ContractSelect } from './ContractSelect';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { HrpContract } from '@/lib/db/contractActions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const formSchema = z.object({
    contractId: z.string({ required_error: 'Bitte wähle einen Bereich aus.' }).min(1),
    type: z.enum(['vacation', 'sick'], {
        errorMap: () => ({ message: 'Bitte wähle einen Typ aus.' }),
    }),
    dateRange: z.object(
        {
            from: z.date({ required_error: 'Startdatum auswählen' }),
            to: z.date().optional(),
        },
        { required_error: 'Bitte wähle einen Zeitraum aus.' },
    ),
});

export default function AbsenceEntry({ contracts }: { contracts: Array<HrpContract> }): ReactElement {
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            contractId: contracts.length === 1 && contracts[0] !== undefined ? contracts[0].contractId : undefined,
            type: 'vacation',
            dateRange: {
                from: new Date(),
                to: new Date(),
            },
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>): Promise<void> => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch('/api/hrp/absences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contractId: values.contractId,
                    type: values.type,
                    startDate: format(values.dateRange.from, 'yyyy-MM-dd'),
                    endDate: format(values.dateRange.to || values.dateRange.from, 'yyyy-MM-dd'),
                }),
            });

            const data = await res.json();

            if (data.success) {
                setSuccess('Abwesenheit erfolgreich eingetragen.');
                form.reset({
                    ...values,
                    dateRange: { from: new Date(), to: new Date() },
                });
            } else {
                setError(data.message || 'Fehler beim Speichern.');
            }
        } catch {
            setError('Verbindungsfehler zum Server.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Abwesenheit eintragen</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit((v) => onSubmit(v))} className="space-y-4">
                        <ContractSelect
                            contracts={contracts}
                            selectedId={form.watch('contractId')}
                            onChange={(id) => form.setValue('contractId', id)}
                        />

                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Typ</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Typ auswählen" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="vacation">Urlaub</SelectItem>
                                            <SelectItem value="sick">Krankheit</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="dateRange"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Zeitraum</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    className={cn(
                                                        'w-full pl-3 text-left font-normal',
                                                        !field.value && 'text-muted-foreground',
                                                    )}
                                                >
                                                    {field.value?.from ? (
                                                        field.value.to ? (
                                                            <>
                                                                {format(field.value.from, 'dd.MM.yyyy')} -{' '}
                                                                {format(field.value.to, 'dd.MM.yyyy')}
                                                            </>
                                                        ) : (
                                                            format(field.value.from, 'dd.MM.yyyy')
                                                        )
                                                    ) : (
                                                        <span>Zeitraum wählen</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={field.value?.from}
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                numberOfMonths={2}
                                                locale={de}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormDescription>Wähle einen einzelnen Tag oder einen Zeitraum aus.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {error && (
                            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 p-3 rounded-md border border-emerald-200">
                                <CheckCircle2 className="h-4 w-4" />
                                {success}
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Speichert...
                                </>
                            ) : (
                                'Abwesenheit speichern'
                            )}
                        </Button>
                    </form>
                </Form>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground border-t pt-4">
                Hinweis: Feiertage werden automatisch berücksichtigt, falls sie im Zeitraum liegen.
            </CardFooter>
        </Card>
    );
}
