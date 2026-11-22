'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { toast } from 'sonner';
import { callAdminApi } from '@/components/hrp/admin/correctionShared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FORECAST_MAX_HOURS, isValidForecastHours } from '@/lib/hrp/forecast';

export interface ForecastPlanningRow {
    contractId: string;
    userName: string;
    validToLabel: string | null;
    plannedHours: string | null;
    finalizedHours: string | null;
    isOwnContract: boolean;
}

interface ForecastPlanningClientProps {
    year: number;
    month: number;
    rows: Array<ForecastPlanningRow>;
}

const toInputValue = (hours: string | null): string => (hours === null ? '' : String(Number.parseFloat(hours)));

const parseInput = (value: string): number | null => (value.trim() === '' ? null : Number(value.replace(',', '.')));

const formatHours = (hours: number): string => `${hours.toLocaleString('de-DE', { maximumFractionDigits: 2 })} h`;

const ForecastPlanningClient = ({ year, month, rows }: ForecastPlanningClientProps): ReactElement => {
    const router = useRouter();
    const [values, setValues] = useState<Record<string, string>>(() =>
        Object.fromEntries(rows.map((row) => [row.contractId, toInputValue(row.plannedHours)])),
    );
    const [isSaving, setIsSaving] = useState(false);

    const editableRows = useMemo(() => rows.filter((row) => row.finalizedHours === null && !row.isOwnContract), [rows]);

    const changedRows = editableRows.filter(
        (row) => parseInput(values[row.contractId] ?? '') !== parseInput(toInputValue(row.plannedHours)),
    );
    const invalidRows = editableRows.filter((row) => {
        const hours = parseInput(values[row.contractId] ?? '');
        return hours !== null && !isValidForecastHours(hours);
    });
    const hasChanges = changedRows.length > 0;

    const plannedCount = rows.filter((row) => row.finalizedHours !== null || parseInput(values[row.contractId] ?? '') !== null).length;
    const totalHours = rows.reduce((sum, row) => {
        const hours = row.finalizedHours === null ? parseInput(values[row.contractId] ?? '') : Number.parseFloat(row.finalizedHours);
        return sum + (hours !== null && Number.isFinite(hours) ? hours : 0);
    }, 0);

    // Month switching is a full page load, so this also protects unsaved input there.
    useEffect(() => {
        if (!hasChanges) {
            return undefined;
        }
        const warn = (event: BeforeUnloadEvent): void => event.preventDefault();
        window.addEventListener('beforeunload', warn);
        return (): void => window.removeEventListener('beforeunload', warn);
    }, [hasChanges]);

    const handleSave = async (): Promise<void> => {
        setIsSaving(true);
        const result = await callAdminApi('/api/hrp/admin/forecasts', 'POST', {
            year,
            month,
            entries: changedRows.map((row) => ({ contractId: row.contractId, hours: parseInput(values[row.contractId] ?? '') })),
        });
        setIsSaving(false);

        if (!result.success) {
            toast.error(result.message ?? 'Die Planung konnte nicht gespeichert werden.');
            return;
        }
        toast.success('Planung gespeichert');
        router.refresh();
    };

    if (rows.length === 0) {
        return <p className="py-8 text-center text-muted-foreground">In diesem Zeitraum gibt es keine aktiven Stundenverträge im Café.</p>;
    }

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Person</TableHead>
                            <TableHead className="w-32 text-right">Stunden</TableHead>
                            <TableHead className="w-40">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row) => {
                            const isFinalized = row.finalizedHours !== null;
                            const value = isFinalized ? toInputValue(row.finalizedHours) : (values[row.contractId] ?? '');
                            const parsed = parseInput(value);
                            const isInvalid = !isFinalized && parsed !== null && !isValidForecastHours(parsed);

                            return (
                                <TableRow key={row.contractId}>
                                    <TableCell>
                                        <div className="font-medium">{row.userName}</div>
                                        {row.validToLabel !== null && (
                                            <div className="text-xs text-muted-foreground">Vertrag endet am {row.validToLabel}</div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Input
                                            aria-label={`Geplante Stunden für ${row.userName}`}
                                            aria-invalid={isInvalid}
                                            type="number"
                                            inputMode="decimal"
                                            min={0}
                                            max={FORECAST_MAX_HOURS}
                                            step={0.25}
                                            value={value}
                                            disabled={isFinalized || row.isOwnContract || isSaving}
                                            onChange={(event) => setValues((prev) => ({ ...prev, [row.contractId]: event.target.value }))}
                                            className="ml-auto w-24 text-right"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {isFinalized ? (
                                            <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                                                Abgerechnet
                                            </Badge>
                                        ) : row.isOwnContract ? (
                                            <span className="text-xs text-muted-foreground">Eigener Vertrag</span>
                                        ) : parsed === null ? (
                                            <span className="text-xs text-amber-700">Noch offen</span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Geplant</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell>
                                {plannedCount} von {rows.length} eingetragen
                            </TableCell>
                            <TableCell className="text-right font-mono">{formatHours(totalHours)}</TableCell>
                            <TableCell />
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>

            {invalidRows.length > 0 && (
                <p className="text-sm text-destructive">Bitte gib die Stunden in Viertelstunden zwischen 0 und {FORECAST_MAX_HOURS} an.</p>
            )}

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={!hasChanges || invalidRows.length > 0 || isSaving}>
                    {isSaving ? 'Wird gespeichert...' : 'Planung speichern'}
                </Button>
            </div>
        </div>
    );
};

export default ForecastPlanningClient;
