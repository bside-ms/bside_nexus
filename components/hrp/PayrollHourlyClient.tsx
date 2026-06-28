'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { HrpAbsenceEntry, HrpEventLogEntry, HrpMonthlyPayrollEntry } from '@/db/schema';
import type { HrpContract } from '@/lib/db/contractActions';
import { createPayrollHourly, upsertForecast } from '@/lib/db/hrpAdminActions';

interface UnbilledDayStat {
    dateStr: string;
    netMinutes: number;
    issues: Array<string>;
    entryIds: Array<string>;
    absenceIds?: Array<string>;
}

interface PayrollHourlyClientProps {
    contractId: string;
    contract: HrpContract;
    year: number;
    month: number;
    unbilledLogs: Array<HrpEventLogEntry>;
    unbilledAbsences: Array<HrpAbsenceEntry>;
    unbilledDayStats: Array<UnbilledDayStat>;
    previousPayroll: HrpMonthlyPayrollEntry | null;
    currentPayrollHourly?: HrpMonthlyPayrollEntry | null;
    initialForecast?: string;
    periodMode?: 'calendar' | '23-22' | '15-14';
    isAlreadyFinalized?: boolean;
}

export function PayrollHourlyClient({
    contractId,
    contract,
    year,
    month,
    unbilledLogs,
    unbilledAbsences,
    unbilledDayStats,
    previousPayroll,
    currentPayrollHourly,
    initialForecast = '0',
    periodMode = '23-22',
    isAlreadyFinalized = false,
}: PayrollHourlyClientProps): ReactElement {
    const router = useRouter();
    const [forecastedHours, setForecastedHours] = useState<string>(initialForecast);

    const hourlyRate = parseFloat(contract.hourlyRate || '0');

    // Threshold logic: > 12h/week -> 2000€, <= 12h/week -> 603€
    const weeklyHours = contract.weeklyHours || 0;
    const initialThreshold = weeklyHours > 12 ? '2000' : '603';
    const [threshold, setThreshold] = useState<string>(initialThreshold);

    const [excludedLogIds, setExcludedLogIds] = useState<Set<string>>(new Set());
    const [excludedAbsenceIds, setExcludedAbsenceIds] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Zeitraum des aktuellen Monats/Zeitraums basierend auf periodMode
    const currentPeriodRange = useMemo(() => {
        if (periodMode === 'calendar') {
            return {
                start: new Date(year, month, 1, 0, 0, 0, 0),
                label: new Date(year, month, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
            };
        }

        const prevEdge = new Date(year, month, 0);
        const prevMonthName = prevEdge.toLocaleDateString('de-DE', { month: 'short' });
        const currMonthName = new Date(year, month, 1).toLocaleDateString('de-DE', { month: 'short' });

        if (periodMode === '15-14') {
            return {
                start: new Date(year, month - 1, 15, 0, 0, 0, 0),
                label: `15. ${prevMonthName} – 14. ${currMonthName}`,
            };
        }
        // default 23-22
        return {
            start: new Date(year, month - 1, 23, 0, 0, 0, 0),
            label: `23. ${prevMonthName} – 22. ${currMonthName}`,
        };
    }, [year, month, periodMode]);

    const processedDays = useMemo(() => {
        return unbilledDayStats.map((s) => {
            const [y, m, d] = s.dateStr.split('-').map(Number);
            const date = new Date(y!, m! - 1, d, 0, 0, 0, 0);

            const allLogsExcluded = s.entryIds.length > 0 && s.entryIds.every((id) => excludedLogIds.has(id));
            const allAbsencesExcluded = s.absenceIds && s.absenceIds.length > 0 && s.absenceIds.every((id) => excludedAbsenceIds.has(id));

            // Wenn es sowohl Logs als auch Abwesenheiten gibt, müssen beide ausgeschlossen sein, damit der Tag als "ausgeschlossen" gilt
            const allExcluded =
                (s.entryIds.length === 0 || allLogsExcluded) && (!s.absenceIds || s.absenceIds.length === 0 || allAbsencesExcluded);

            const isCurrentMonth = date >= currentPeriodRange.start;

            return {
                ...s,
                date,
                allExcluded,
                isCurrentMonth,
            };
        });
    }, [unbilledDayStats, excludedLogIds, excludedAbsenceIds, currentPeriodRange]);

    const recordedMinutesCurrent = useMemo(() => {
        return processedDays.filter((d) => d.isCurrentMonth && !d.allExcluded).reduce((acc, d) => acc + d.netMinutes, 0);
    }, [processedDays]);

    const recordedMinutesPrevious = useMemo(() => {
        return processedDays.filter((d) => !d.isCurrentMonth && !d.allExcluded).reduce((acc, d) => acc + d.netMinutes, 0);
    }, [processedDays]);

    const recordedMinutes = recordedMinutesCurrent + recordedMinutesPrevious;

    const correctionMinutes = useMemo(() => {
        if (!previousPayroll) {
            return 0;
        }
        // Forecast aus Vormonat (in Stunden)
        const prevForecastHours = parseFloat(previousPayroll.forecastedHoursLateMonth || '0');
        return -prevForecastHours * 60;
    }, [previousPayroll]);

    const totalMinutes = recordedMinutes + correctionMinutes + (parseFloat(forecastedHours) || 0) * 60;
    const totalHours = totalMinutes / 60;

    const handleToggleDay = (dateStr: string, excluded: boolean) => {
        const newExcludedLogs = new Set(excludedLogIds);
        const newExcludedAbsences = new Set(excludedAbsenceIds);
        const day = processedDays.find((d) => d.dateStr === dateStr);
        if (day) {
            day.entryIds.forEach((id) => {
                if (excluded) {
                    newExcludedLogs.add(id);
                } else {
                    newExcludedLogs.delete(id);
                }
            });
            day.absenceIds?.forEach((id) => {
                if (excluded) {
                    newExcludedAbsences.add(id);
                } else {
                    newExcludedAbsences.delete(id);
                }
            });
        }
        setExcludedLogIds(newExcludedLogs);
        setExcludedAbsenceIds(newExcludedAbsences);
    };

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            const eventLogIds = unbilledLogs.map((l) => l.id).filter((id) => !excludedLogIds.has(id));
            const absenceIds = unbilledAbsences.map((a) => a.id).filter((id) => !excludedAbsenceIds.has(id));

            await upsertForecast({
                contractId,
                year,
                month,
                forecastedHours: (parseFloat(forecastedHours) || 0).toFixed(2),
            });

            await createPayrollHourly({
                contractId,
                year,
                month,
                recordedHours: (recordedMinutes / 60).toFixed(2),
                forecastedHours: (parseFloat(forecastedHours) || 0).toFixed(2),
                correctionFromPrevMonth: (correctionMinutes / 60).toFixed(2),
                finalPayoutHours: totalHours.toFixed(2),
                eventLogIds,
                absenceIds,
            });

            toast.success('Abrechnung erfolgreich erstellt');
            router.refresh();
        } catch {
            toast.error('Fehler beim Speichern der Abrechnung');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatMinutes = (mins: number) => {
        const h = Math.floor(Math.abs(mins) / 60);
        const m = Math.abs(mins) % 60;
        const sign = mins < 0 ? '-' : '';
        return `${sign}${h}:${m.toString().padStart(2, '0')}h`;
    };

    return (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle>Monatsabrechnung erstellen (Stundenlöhner)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <div className="flex flex-col">
                                <span>Stunden aktueller Zeitraum:</span>
                                <span className="text-[10px] text-muted-foreground">{currentPeriodRange.label}</span>
                            </div>
                            <span className="font-mono">{formatMinutes(recordedMinutesCurrent)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                            <span>Nicht abgerechnete Stunden (Vormonate):</span>
                            <span className="font-mono">{formatMinutes(recordedMinutesPrevious)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2 text-muted-foreground">
                            <span>Korrektur Forecast Vormonat:</span>
                            <span className="font-mono">{formatMinutes(correctionMinutes)}</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                            <label htmlFor="forecast" className="flex-1">
                                Forecast für Restmonat (h):
                            </label>
                            <Input
                                id="forecast"
                                type="number"
                                step="0.5"
                                value={
                                    isAlreadyFinalized
                                        ? parseFloat(currentPayrollHourly?.forecastedHoursLateMonth || '0').toString()
                                        : forecastedHours
                                }
                                onChange={(e) => setForecastedHours(e.target.value)}
                                className="w-24 text-right"
                                disabled={isAlreadyFinalized}
                            />
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                            <label htmlFor="threshold" className="flex-1">
                                Mini- / Midijobgrenze (€):
                            </label>
                            <Input
                                id="threshold"
                                type="number"
                                step="1"
                                value={threshold}
                                onChange={(e) => setThreshold(e.target.value)}
                                className="w-24 text-right"
                                disabled
                            />
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                            <span>Stundenlohn:</span>
                            <span className="font-mono">{hourlyRate.toFixed(2)} €/h</span>
                        </div>
                        <div className="flex justify-between items-center pt-4 text-xl font-bold">
                            <span>Gesamtauszahlung:</span>
                            <div className="flex flex-col items-end">
                                <span>
                                    {formatMinutes(totalMinutes)} ({totalHours.toFixed(2)} h)
                                </span>
                                <span className="text-sm font-normal text-muted-foreground">
                                    {(totalHours * hourlyRate).toFixed(2)} € Brutto
                                </span>
                            </div>
                        </div>

                        {totalHours * hourlyRate > (parseFloat(threshold) || 603) && (
                            <div className="p-3 bg-amber-100 text-amber-800 rounded-md text-sm">
                                Achtung: Der Betrag überschreitet die Geringfügigkeitsgrenze von {threshold}€. Prüfe, ob Tage in den
                                nächsten Monat verschoben werden sollen.
                            </div>
                        )}

                        <Button
                            onClick={handleSave}
                            disabled={isSubmitting || totalHours < 0 || isAlreadyFinalized}
                            className="w-full mt-4"
                        >
                            {isSubmitting
                                ? 'Wird gespeichert...'
                                : isAlreadyFinalized
                                  ? 'Bereits abgerechnet'
                                  : 'Abrechnung jetzt durchführen'}
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold">Abzurechnende Tage</h3>
                        <p className="text-xs text-muted-foreground">Wähle Tage ab, um sie erst im nächsten Monat abzurechnen.</p>
                        <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-2">
                            {processedDays.map((d) => (
                                <div key={d.dateStr} className="flex items-center justify-between text-sm">
                                    <div className="flex flex-col flex-1">
                                        <div className="flex items-center gap-2">
                                            <input
                                                id={`day-${d.dateStr}`}
                                                type="checkbox"
                                                checked={!d.allExcluded}
                                                onChange={(e) => handleToggleDay(d.dateStr, !e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <label htmlFor={`day-${d.dateStr}`}>
                                                {d.date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                {!d.isCurrentMonth && (
                                                    <span className="ml-1 text-[10px] bg-slate-100 px-1 rounded text-slate-500">
                                                        Vormonat
                                                    </span>
                                                )}
                                            </label>
                                        </div>
                                        {d.issues.length > 0 && (
                                            <div className="ml-6 flex flex-col gap-0.5">
                                                {d.issues.map((issue, idx) => (
                                                    <span key={idx} className="text-[10px] text-amber-600 leading-tight">
                                                        {issue}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <span className="font-mono">{formatMinutes(d.netMinutes)}</span>
                                </div>
                            ))}
                            {processedDays.length === 0 && (
                                <p className="text-muted-foreground text-center py-4 italic">Keine offenen Einträge gefunden.</p>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
