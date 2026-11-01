'use client';

import { useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { toast } from 'sonner';
import CorrectionPreview from '@/components/hrp/admin/CorrectionPreview';
import type { CorrectionAbsence, CorrectionEntry, EditableContract } from '@/components/hrp/admin/correctionShared';
import {
    callAdminApi,
    CORRECTION_MARKER,
    ENTRY_TYPE_OPTIONS,
    formatBerlinDateTime,
    getAbsenceTypeLabel,
    getContractsValidAt,
    getEntryTypeLabel,
    toLocalInputValue,
} from '@/components/hrp/admin/correctionShared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { DayPreview } from '@/lib/db/hrpCorrectionActions';
import { getMisplacedStopSuggestions } from '@/lib/hrp/hrpLogic';

type Action =
    | { kind: 'create' }
    | { kind: 'correct'; entry: CorrectionEntry }
    | { kind: 'delete'; entry: CorrectionEntry }
    | { kind: 'deleteAbsence'; absence: CorrectionAbsence };

interface Props {
    day: string; // Logischer Arbeitstag: YYYY-MM-DD
    dayLabel: string;
    entries: Array<CorrectionEntry>;
    absences: Array<CorrectionAbsence>;
    contracts: Array<EditableContract>;
    defaultContractId: string | null;
}

const selectClassName = 'w-full rounded border bg-background px-3 py-2 text-sm';

const AdminDayEditor = ({ day, dayLabel, entries, absences, contracts, defaultContractId }: Props): ReactElement => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [action, setAction] = useState<Action | null>(null);
    const [entryType, setEntryType] = useState<string>('start');
    const [dateTime, setDateTime] = useState('');
    const [contractId, setContractId] = useState('');
    const [reason, setReason] = useState('');
    const [preview, setPreview] = useState<Array<DayPreview> | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);

    const editableContractIds = useMemo(() => new Set(contracts.map((c) => c.id)), [contracts]);
    const contractsForDay = useMemo(() => getContractsValidAt(contracts, day), [contracts, day]);
    const sortedEntries = useMemo(() => [...entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp)), [entries]);
    const suggestions = useMemo(
        () => getMisplacedStopSuggestions(entries.map((e) => ({ id: e.id, entryType: e.entryType, loggedTimestamp: e.timestamp }))),
        [entries],
    );

    const isEditable = (item: { contractId: string | null; isBilled: boolean }): boolean =>
        item.contractId !== null && editableContractIds.has(item.contractId) && !item.isBilled;

    const resetForm = (): void => {
        setAction(null);
        setReason('');
        setPreview(null);
        setError(null);
    };

    const startAction = (next: Action, prefill?: { entryType: string; date: Date; reason?: string }): void => {
        resetForm();
        setAction(next);
        if (prefill?.reason !== undefined) {
            setReason(prefill.reason);
        }
        if (next.kind === 'create') {
            setEntryType('start');
            setDateTime(`${day}T09:00`);
            const preferred = contractsForDay.find((c) => c.id === defaultContractId) ?? contractsForDay[0];
            setContractId(preferred?.id ?? '');
        }
        if (next.kind === 'correct') {
            setEntryType(prefill?.entryType ?? next.entry.entryType);
            setDateTime(toLocalInputValue(prefill?.date ?? new Date(next.entry.timestamp)));
        }
    };

    // Neue Eingaben verwerfen die Vorschau.
    const onInputChange =
        <T,>(setter: (value: T) => void) =>
        (value: T): void => {
            setter(value);
            setPreview(null);
            setError(null);
        };

    const buildRequest = (dryRun: boolean): { url: string; method: 'POST' | 'PATCH' | 'DELETE'; body: object } | null => {
        if (action === null) {
            return null;
        }
        const timestamp = dateTime === '' ? '' : new Date(dateTime).toISOString();
        switch (action.kind) {
            case 'create':
                return { url: '/api/hrp/admin/entries', method: 'POST', body: { contractId, entryType, timestamp, reason, dryRun } };
            case 'correct':
                return {
                    url: '/api/hrp/admin/entries',
                    method: 'PATCH',
                    body: { id: action.entry.id, entryType, timestamp, reason, dryRun },
                };
            case 'delete':
                return { url: '/api/hrp/admin/entries', method: 'DELETE', body: { id: action.entry.id, reason, dryRun } };
            case 'deleteAbsence':
                return { url: '/api/hrp/admin/absences', method: 'DELETE', body: { ids: [action.absence.id], reason } };
        }
    };

    const requestPreview = async (): Promise<void> => {
        const request = buildRequest(true);
        if (request === null) {
            return;
        }
        setIsBusy(true);
        const result = await callAdminApi(request.url, request.method, request.body);
        setIsBusy(false);
        if (!result.success) {
            setError(result.message ?? null);
            return;
        }
        setPreview(result.preview ?? []);
    };

    const save = async (): Promise<void> => {
        const request = buildRequest(false);
        if (request === null) {
            return;
        }
        setIsBusy(true);
        const result = await callAdminApi(request.url, request.method, request.body);
        setIsBusy(false);
        if (!result.success) {
            setError(result.message ?? null);
            return;
        }
        toast.success('Die Korrektur wurde gespeichert.');
        resetForm();
        setIsOpen(false);
        router.refresh();
    };

    // Erst nach der Vorschau speichern (außer bei Abwesenheiten).
    const needsPreview = action !== null && action.kind !== 'deleteAbsence';
    const hasReason = reason.trim().length >= 3;
    const canSave = hasReason && !isBusy && (!needsPreview || preview !== null);

    const renderForm = (): ReactElement | null => {
        if (action === null) {
            return null;
        }
        const titles: Record<Action['kind'], string> = {
            create: 'Buchung hinzufügen',
            correct: 'Buchung ändern',
            delete: 'Buchung löschen',
            deleteAbsence: 'Abwesenheit löschen',
        };

        return (
            <div className="space-y-3 rounded border p-3">
                <div className="font-medium text-sm">{titles[action.kind]}</div>

                {(action.kind === 'delete' || action.kind === 'correct') && (
                    <p className="text-xs text-muted-foreground">
                        Bisher: {getEntryTypeLabel(action.entry.entryType)}, {formatBerlinDateTime(action.entry.timestamp)}
                    </p>
                )}
                {action.kind === 'deleteAbsence' && (
                    <p className="text-xs text-muted-foreground">
                        {getAbsenceTypeLabel(action.absence.type)} am {action.absence.date} ({action.absence.hoursValue} h)
                    </p>
                )}

                {(action.kind === 'create' || action.kind === 'correct') && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label htmlFor={`entry-type-${day}`}>Art</Label>
                            <select
                                id={`entry-type-${day}`}
                                className={selectClassName}
                                value={entryType}
                                onChange={(e) => onInputChange(setEntryType)(e.target.value)}
                            >
                                {ENTRY_TYPE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor={`entry-time-${day}`}>Datum und Uhrzeit</Label>
                            <Input
                                id={`entry-time-${day}`}
                                type="datetime-local"
                                value={dateTime}
                                onChange={(e) => onInputChange(setDateTime)(e.target.value)}
                            />
                        </div>
                        {action.kind === 'create' && contractsForDay.length > 1 && (
                            <div className="space-y-1 sm:col-span-2">
                                <Label htmlFor={`entry-contract-${day}`}>Vertrag</Label>
                                <select
                                    id={`entry-contract-${day}`}
                                    className={selectClassName}
                                    value={contractId}
                                    onChange={(e) => onInputChange(setContractId)(e.target.value)}
                                >
                                    {contractsForDay.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-1">
                    <Label htmlFor={`entry-reason-${day}`}>Begründung (Pflicht)</Label>
                    <Textarea
                        id={`entry-reason-${day}`}
                        value={reason}
                        maxLength={300}
                        placeholder="z. B. Gehen-Buchung war auf den falschen Tag gesetzt"
                        onChange={(e) => onInputChange(setReason)(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                        Wird mit deinem Namen und dem heutigen Datum am Eintrag gespeichert ({reason.length}/300).
                    </p>
                </div>

                {preview !== null && <CorrectionPreview preview={preview} />}
                {error !== null && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={resetForm} disabled={isBusy}>
                        Abbrechen
                    </Button>
                    {needsPreview && (
                        <Button type="button" variant="outline" size="sm" onClick={requestPreview} disabled={isBusy || !hasReason}>
                            Vorschau
                        </Button>
                    )}
                    <Button
                        type="button"
                        size="sm"
                        variant={action.kind === 'delete' || action.kind === 'deleteAbsence' ? 'destructive' : 'default'}
                        onClick={save}
                        disabled={!canSave}
                    >
                        {action.kind === 'delete' || action.kind === 'deleteAbsence' ? 'Löschen' : 'Speichern'}
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) {
                    resetForm();
                }
            }}
        >
            <DialogTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2" title={`${dayLabel} korrigieren`}>
                    <Pencil className="h-3.5 w-3.5" />
                    {suggestions.length > 0 && <span className="ml-1 h-2 w-2 rounded-full bg-amber-500" aria-label="Korrekturvorschlag" />}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Korrektur: {dayLabel}</DialogTitle>
                    <DialogDescription>
                        Änderungen werden nicht überschrieben: Die alte Buchung wird mit Begründung als gelöscht markiert und eine neue
                        angelegt.
                    </DialogDescription>
                </DialogHeader>

                {suggestions.map((s) => {
                    const entry = entries.find((e) => e.id === s.id);
                    if (entry === undefined || !isEditable(entry)) {
                        return null;
                    }
                    return (
                        <div key={s.id} className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                            <p>
                                Die Gehen-Buchung {formatBerlinDateTime(entry.timestamp)} liegt vor dem Kommen desselben Tages. Vermutlich
                                war {formatBerlinDateTime(s.suggested.toISOString())} gemeint.
                            </p>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="mt-2 bg-white"
                                onClick={() =>
                                    startAction(
                                        { kind: 'correct', entry },
                                        {
                                            entryType: 'stop',
                                            date: s.suggested,
                                            reason: `Gehen lag vor dem Kommen desselben Tages, auf den Folgetag verschoben (${formatBerlinDateTime(entry.timestamp)} → ${formatBerlinDateTime(s.suggested.toISOString())}).`,
                                        },
                                    )
                                }
                            >
                                Auf Folgetag verschieben
                            </Button>
                        </div>
                    );
                })}

                <div className="space-y-1">
                    <div className="text-sm font-medium">Buchungen</div>
                    {sortedEntries.length === 0 && <p className="text-sm text-muted-foreground">Keine Buchungen an diesem Tag.</p>}
                    {sortedEntries.map((entry) => (
                        <div
                            key={entry.id}
                            className="flex flex-wrap items-center justify-between gap-2 border-b py-1.5 text-sm last:border-b-0"
                        >
                            <div className="min-w-0">
                                <span className="font-medium">{getEntryTypeLabel(entry.entryType)}</span>{' '}
                                <span className="text-muted-foreground">{formatBerlinDateTime(entry.timestamp)}</span>
                                {entry.comment !== null && entry.comment.length > 0 && (
                                    <div
                                        className={`text-xs break-words ${entry.comment.includes(CORRECTION_MARKER) ? 'text-amber-700' : 'text-muted-foreground'}`}
                                    >
                                        {entry.comment}
                                    </div>
                                )}
                            </div>
                            {isEditable(entry) ? (
                                <div className="flex gap-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => startAction({ kind: 'correct', entry })}
                                    >
                                        Ändern
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => startAction({ kind: 'delete', entry })}
                                    >
                                        Löschen
                                    </Button>
                                </div>
                            ) : (
                                <span className="text-xs text-muted-foreground">{entry.isBilled ? 'abgerechnet' : 'nicht änderbar'}</span>
                            )}
                        </div>
                    ))}
                </div>

                {absences.length > 0 && (
                    <div className="space-y-1">
                        <div className="text-sm font-medium">Abwesenheiten</div>
                        {absences.map((absence) => (
                            <div
                                key={absence.id}
                                className="flex flex-wrap items-center justify-between gap-2 border-b py-1.5 text-sm last:border-b-0"
                            >
                                <span>
                                    {getAbsenceTypeLabel(absence.type)} ({absence.hoursValue} h)
                                </span>
                                {isEditable(absence) && absence.type !== 'holiday' ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => startAction({ kind: 'deleteAbsence', absence })}
                                    >
                                        Löschen
                                    </Button>
                                ) : (
                                    <span className="text-xs text-muted-foreground">
                                        {absence.isBilled ? 'abgerechnet' : 'nicht änderbar'}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {renderForm()}

                {action === null && (
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => startAction({ kind: 'create' })}
                            disabled={contractsForDay.length === 0}
                        >
                            Buchung hinzufügen
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default AdminDayEditor;
