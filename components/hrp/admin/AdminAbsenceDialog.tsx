'use client';

import { useMemo, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { toast } from 'sonner';
import type { EditableContract } from '@/components/hrp/admin/correctionShared';
import { ABSENCE_TYPE_OPTIONS, callAdminApi, getContractsValidAt } from '@/components/hrp/admin/correctionShared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
    contracts: Array<EditableContract>;
    defaultContractId: string | null;
    initialDate: string; // YYYY-MM-DD für die Vorausfüllung.
}

const selectClassName = 'w-full rounded border bg-background px-3 py-2 text-sm';

// Admins tragen Abwesenheiten für die gewählte Person ein.
const AdminAbsenceDialog = ({ contracts, defaultContractId, initialDate }: Props): ReactElement => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState<string>('vacation');
    const [startDate, setStartDate] = useState(initialDate);
    const [endDate, setEndDate] = useState(initialDate);
    const [contractId, setContractId] = useState(defaultContractId ?? contracts[0]?.id ?? '');
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);

    const contractsForStart = useMemo(() => getContractsValidAt(contracts, startDate), [contracts, startDate]);
    const selectedContractIsValid = contractsForStart.some((c) => c.id === contractId);
    const canSave =
        reason.trim().length >= 3 && startDate !== '' && endDate !== '' && startDate <= endDate && selectedContractIsValid && !isBusy;

    const reset = (): void => {
        setType('vacation');
        setStartDate(initialDate);
        setEndDate(initialDate);
        setContractId(defaultContractId ?? contracts[0]?.id ?? '');
        setReason('');
        setError(null);
    };

    const onStartChange = (value: string): void => {
        setStartDate(value);
        if (endDate < value) {
            setEndDate(value);
        }

        // Gilt der Vertrag am Starttag nicht, einen passenden wählen.
        const valid = getContractsValidAt(contracts, value);
        if (!valid.some((c) => c.id === contractId)) {
            setContractId(valid.find((c) => c.id === defaultContractId)?.id ?? valid[0]?.id ?? '');
        }
    };

    const save = async (): Promise<void> => {
        setIsBusy(true);
        const result = await callAdminApi('/api/hrp/admin/absences', 'POST', { contractId, type, startDate, endDate, reason });
        setIsBusy(false);
        if (!result.success) {
            setError(result.message ?? null);
            return;
        }
        toast.success(result.count === 1 ? '1 Tag eingetragen.' : `${result.count ?? 0} Tage eingetragen.`);
        reset();
        setIsOpen(false);
        router.refresh();
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) {
                    reset();
                }
            }}
        >
            <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-2">
                    <CalendarPlus className="h-4 w-4" />
                    Abwesenheit eintragen
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Abwesenheit eintragen</DialogTitle>
                    <DialogDescription>
                        Feiertage und Tage, die laut Vertrag keine Arbeitstage sind, werden übersprungen. Bestehender Urlaub und Krankheit
                        im Zeitraum werden überschrieben, sofern sie noch nicht abgerechnet sind.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label htmlFor="absence-type">Art</Label>
                        <select id="absence-type" className={selectClassName} value={type} onChange={(e) => setType(e.target.value)}>
                            {ABSENCE_TYPE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="absence-start">Von</Label>
                            <Input id="absence-start" type="date" value={startDate} onChange={(e) => onStartChange(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="absence-end">Bis</Label>
                            <Input
                                id="absence-end"
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    {contracts.length > 1 && (
                        <div className="space-y-1">
                            <Label htmlFor="absence-contract">Vertrag</Label>
                            <select
                                id="absence-contract"
                                className={selectClassName}
                                value={contractId}
                                onChange={(e) => setContractId(e.target.value)}
                            >
                                {contractsForStart.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {!selectedContractIsValid && (
                        <p className="text-sm text-red-600">Am Starttag gilt kein Vertrag, den du korrigieren darfst.</p>
                    )}
                    <div className="space-y-1">
                        <Label htmlFor="absence-reason">Begründung (Pflicht)</Label>
                        <Textarea
                            id="absence-reason"
                            value={reason}
                            maxLength={300}
                            placeholder="z. B. Urlaubsantrag vom 01.10. nicht eingetragen"
                            onChange={(e) => setReason(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Wird mit deinem Namen im Protokoll gespeichert ({reason.length}/300).
                        </p>
                    </div>
                    {error !== null && <p className="text-sm text-red-600">{error}</p>}
                </div>

                <DialogFooter>
                    <Button type="button" onClick={save} disabled={!canSave}>
                        Eintragen
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AdminAbsenceDialog;
