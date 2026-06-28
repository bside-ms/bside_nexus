'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { HrpHolidayConfigEntry } from '@/db/schema';
import { type HrpContract } from '@/lib/db/contractActions';
import { bookHoliday, upsertHolidayConfig } from '@/lib/db/hrpAdminActions';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Holiday {
    id: string;
    date: string;
    name: string;
    year: number;
    config?: HrpHolidayConfigEntry;
}

export function HolidayConfigForm({
    userId,
    contracts,
    year,
    initialHolidays,
}: {
    userId: string;
    contracts: Array<HrpContract>;
    year: number;
    initialHolidays: Array<Holiday>;
}): ReactElement {
    const [holidays, setHolidays] = useState<Array<Holiday>>(initialHolidays);
    const [localConfigs, setLocalConfigs] = useState<Record<string, 'off' | 'work_required' | 'credited'>>({});

    const getContractForDate = (date: string) => {
        const d = new Date(date);
        return contracts.find((c) => new Date(c.validFrom) <= d && (!c.validTo || new Date(c.validTo) >= d));
    };

    const handleSave = async (holiday: Holiday, strategy: 'off' | 'work_required' | 'credited') => {
        const contract = getContractForDate(holiday.date);
        if (!contract) {
            toast.error('Kein gültiger Vertrag für dieses Datum gefunden', {
                className: 'bg-red-50 text-red-900 border-red-200',
            });
            return;
        }

        try {
            const result = await upsertHolidayConfig({
                id: holiday.config?.id,
                contractId: contract.contractId,
                date: holiday.date,
                strategy,
            });

            if (!result.success) {
                toast.error(result.error || 'Fehler beim Speichern', {
                    className: 'bg-red-50 text-red-900 border-red-200',
                });
                return;
            }

            const updatedConfig = result.data;
            setHolidays((prev) => prev.map((h) => (h.id === holiday.id ? { ...h, config: updatedConfig } : h)));
            setLocalConfigs((prev) => {
                const next = { ...prev };
                delete next[holiday.date];
                return next;
            });

            toast.success('Konfiguration gespeichert');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Fehler beim Speichern', {
                className: 'bg-red-50 text-red-900 border-red-200',
            });
        }
    };

    const handleStrategyChange = (date: string, val: 'off' | 'work_required' | 'credited') => {
        setLocalConfigs((prev) => ({ ...prev, [date]: val }));
    };

    const handleBookHoliday = async (holiday: Holiday) => {
        const contract = getContractForDate(holiday.date);
        if (!contract || !holiday.config?.id) {
            return;
        }
        try {
            await bookHoliday(holiday.config.id, userId, contract.contractId, holiday.date);
            toast.success('Feiertag gebucht');
            window.location.reload();
        } catch {
            toast.error('Fehler beim Buchen');
        }
    };

    const getStrategyForHoliday = (h: Holiday) => {
        return h.config?.strategy || null;
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Feiertagskonfiguration ({year})</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Datum</TableHead>
                            <TableHead>Wochentag</TableHead>
                            <TableHead>Feiertag</TableHead>
                            <TableHead>Strategie</TableHead>
                            <TableHead>Aktion</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {holidays.map((h) => {
                            const isPast = new Date(h.date) < new Date();
                            const hasConfig = !!h.config;
                            const strategy = getStrategyForHoliday(h);
                            return (
                                <TableRow key={h.id}>
                                    <TableCell>{format(new Date(h.date), 'dd.MM.yyyy')}</TableCell>
                                    <TableCell>{format(new Date(h.date), 'EE', { locale: de })}</TableCell>
                                    <TableCell>{h.name}</TableCell>
                                    <TableCell>
                                        <div className={`text-sm mb-2 ${!hasConfig ? 'text-red-500 font-semibold' : ''}`}>
                                            {!hasConfig
                                                ? 'Strategie noch nachzutragen'
                                                : strategy === 'off'
                                                  ? 'Mitarbeiter arbeitet an dem Tag ohnehin nicht.'
                                                  : strategy === 'work_required'
                                                    ? 'Arbeit angeordnet. Ausgleichtag in der folgenden Woche.'
                                                    : 'Arbeitstag wird ohne Arbeit gutgeschrieben.'}
                                        </div>
                                        {isPast && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                                Status:{' '}
                                                {h.config?.status === 'none' ? 'Keine Aktion erforderlich' : h.config?.status || 'none'}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm">
                                                    Strategie bearbeiten
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Strategie bearbeiten</DialogTitle>
                                                </DialogHeader>
                                                <Select
                                                    value={strategy || 'off'}
                                                    onValueChange={(val: 'off' | 'work_required' | 'credited') =>
                                                        handleStrategyChange(h.date, val)
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="off">Mitarbeiter arbeitet an dem Tag ohnehin nicht.</SelectItem>
                                                        <SelectItem value="work_required">
                                                            Arbeit angeordnet. Ausgleichtag in der folgenden Woche.
                                                        </SelectItem>
                                                        <SelectItem value="credited">
                                                            Arbeitstag wird ohne Arbeit gutgeschrieben.
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    onClick={() =>
                                                        handleSave(
                                                            h,
                                                            (localConfigs[h.date] || strategy || 'off') as
                                                                'off' | 'work_required' | 'credited',
                                                        )
                                                    }
                                                >
                                                    Speichern
                                                </Button>
                                            </DialogContent>
                                        </Dialog>
                                        {isPast && h.config?.status === 'none' && strategy === 'credited' && (
                                            <Button variant="outline" size="sm" onClick={() => handleBookHoliday(h)} className="ml-2">
                                                Feiertag buchen
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
