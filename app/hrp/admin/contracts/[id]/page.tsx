'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { BiEdit, BiPlus, BiTrash } from 'react-icons/bi';
import { toast } from 'sonner';
import WorkingDaysSelect, { formatWorkingDays } from '@/components/hrp/WorkingDaysSelect';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { HrpYearlyEntry } from '@/db/schema';
import type { ContractChangePreview } from '@/lib/db/contractChangeActions';
import type { ContractDetails } from '@/lib/db/hrpAdminActions';
import { format, parseISO, subDays } from 'date-fns';

// Hilfsfunktion für Monatsende-Daten
const getEndOfMonth = (offsetMonths: number): string => {
    const d = new Date();
    d.setMonth(d.getMonth() + offsetMonths + 1);
    d.setDate(0);
    return d.toISOString().split('T')[0]!;
};

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];

const toDateString = (date: Date | string): string => new Date(date).toISOString().slice(0, 10);

const formatDate = (date: string): string => format(parseISO(date), 'dd.MM.yyyy');

// Stichtage für Vertragsänderungen: Monatserster.
const getEffectiveFromOptions = (validFrom: Date | string, validTo: Date | string | null): Array<string> => {
    const now = new Date();
    const validFromString = toDateString(validFrom);
    const validToString = validTo ? toDateString(validTo) : null;
    const options: Array<string> = [];

    for (let offset = 3; offset >= -12; offset--) {
        const option = format(new Date(now.getFullYear(), now.getMonth() + offset, 1), 'yyyy-MM-dd');
        if (option > validFromString && (validToString === null || option <= validToString)) {
            options.push(option);
        }
    }

    return options;
};

const getDefaultEffectiveFrom = (options: Array<string>): string => {
    const now = new Date();
    const firstOfNextMonth = format(new Date(now.getFullYear(), now.getMonth() + 1, 1), 'yyyy-MM-dd');
    return options.includes(firstOfNextMonth) ? firstOfNextMonth : (options[0] ?? '');
};

export default function ContractDetailPage(): ReactElement {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const contractId = params?.id;

    const [data, setData] = useState<{ contract: ContractDetails; leaveAccounts: Array<HrpYearlyEntry>; canEdit: boolean } | null>(null);
    const [loading, setLoading] = useState(true);

    // Dialog State für Leave Accounts
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Partial<HrpYearlyEntry> | null>(null);

    // Dialog State für Vertragsänderung
    const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
    const [contractFormData, setContractFormData] = useState({
        type: '',
        weeklyHours: 0,
        hourlyRate: '0.00',
        vacationDaysPerYear: 0,
        workingDays: DEFAULT_WORKING_DAYS,
        effectiveFrom: '',
    });
    const [changePreview, setChangePreview] = useState<ContractChangePreview | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);

    // Dialog State für Vertrag löschen
    const [isTerminateDialogOpen, setIsTerminateDialogOpen] = useState(false);
    const [terminationDate, setTerminationDate] = useState('');

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/hrp/contracts/${contractId}`);
            const result = await res.json();
            if (result.success) {
                setData(result.data);
                setContractFormData({
                    type: result.data.contract.type,
                    weeklyHours: result.data.contract.weeklyHours,
                    hourlyRate: result.data.contract.hourlyRate || '0.00',
                    vacationDaysPerYear: result.data.contract.vacationDaysPerYear,
                    workingDays: result.data.contract.workingDays ?? DEFAULT_WORKING_DAYS,
                    effectiveFrom: getDefaultEffectiveFrom(
                        getEffectiveFromOptions(result.data.contract.validFrom, result.data.contract.validTo),
                    ),
                });
                setTerminationDate(getEndOfMonth(0));
            } else {
                toast.error(result.message || 'Fehler beim Laden');
            }
        } catch {
            toast.error('Netzwerkfehler');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (contractId) {
            fetchData();
        }
    }, [contractId]);

    // Vorschau: was ab dem Stichtag an den neuen Vertrag übergeht und ob die Änderung zulässig ist.
    const workingDaysKey = contractFormData.workingDays.join(',');
    useEffect(() => {
        if (!isContractDialogOpen || contractFormData.effectiveFrom === '' || contractFormData.workingDays.length === 0) {
            setChangePreview(null);
            setPreviewError(null);
            return;
        }

        let ignore = false;
        setChangePreview(null);
        setPreviewError(null);
        const loadPreview = async () => {
            try {
                const res = await fetch(`/api/hrp/contracts/${contractId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ ...contractFormData, dryRun: true }),
                });
                const result = await res.json();
                if (!ignore) {
                    setChangePreview(result.success ? result.preview : null);
                    setPreviewError(result.success ? null : (result.message ?? 'Die Vorschau konnte nicht geladen werden.'));
                }
            } catch {
                if (!ignore) {
                    setChangePreview(null);
                    setPreviewError('Die Vorschau konnte nicht geladen werden.');
                }
            }
        };
        loadPreview();

        return () => {
            ignore = true;
        };
    }, [isContractDialogOpen, contractId, contractFormData.effectiveFrom, contractFormData.type, workingDaysKey]);

    const handleContractUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/hrp/contracts/${contractId}`, {
                method: 'PUT',
                body: JSON.stringify(contractFormData),
            });
            const result = await res.json();
            if (result.success) {
                toast.success('Vertrag aktualisiert (neuer Vertrag angelegt)');
                setIsContractDialogOpen(false);
                router.push(`/hrp/admin/contracts/${result.newId}`);
            } else {
                toast.error(result.message || 'Update fehlgeschlagen');
            }
        } catch {
            toast.error('Netzwerkfehler');
        }
    };

    const handleTerminateContract = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/hrp/contracts/${contractId}?terminationDate=${terminationDate}`, {
                method: 'DELETE',
            });
            const result = await res.json();
            if (result.success) {
                toast.success('Vertrag beendet');
                setIsTerminateDialogOpen(false);
                fetchData();
            } else {
                toast.error(result.message || 'Löschen fehlgeschlagen');
            }
        } catch {
            toast.error('Netzwerkfehler');
        }
    };

    const handleOpenAdd = () => {
        setEditingAccount({
            contractId,
            year: new Date().getFullYear(),
            totalVacationDays: data?.contract.vacationDaysPerYear || 0,
            remainingDaysFromLastYear: 0,
            overtimeCarryoverHours: '0.00',
        });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (account: HrpYearlyEntry) => {
        setEditingAccount(account);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
            return;
        }

        try {
            const res = await fetch(`/api/hrp/leave-accounts?id=${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) {
                toast.success('Eintrag gelöscht');
                fetchData();
            } else {
                toast.error('Löschen fehlgeschlagen');
            }
        } catch {
            toast.error('Netzwerkfehler');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Bereinige das Objekt, bevor es gesendet wird
            const payload = {
                id: editingAccount?.id,
                contractId: editingAccount?.contractId,
                year: editingAccount?.year,
                totalVacationDays: editingAccount?.totalVacationDays,
                remainingDaysFromLastYear: editingAccount?.remainingDaysFromLastYear,
                overtimeCarryoverHours: editingAccount?.overtimeCarryoverHours,
            };

            const res = await fetch('/api/hrp/leave-accounts', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            const result = await res.json();
            if (result.success) {
                toast.success(editingAccount?.id ? 'Aktualisiert' : 'Angelegt');
                setIsDialogOpen(false);
                fetchData();
            } else {
                toast.error('Speichern fehlgeschlagen');
            }
        } catch {
            toast.error('Netzwerkfehler');
        }
    };

    const breadCrumbs = [
        { title: 'Zeiterfassung', url: '/hrp' },
        { title: 'Administration', url: '/hrp/admin' },
        { title: 'Verträge', url: '/hrp/admin/contracts' },
        { title: 'Vertragsdetails', active: true },
    ];

    if (loading) {
        return <div>Laden...</div>;
    }
    if (!data) {
        return <div>Vertrag nicht gefunden.</div>;
    }

    // Nur Systemadmins dürfen Verträge und Jahresabschlüsse ändern.
    const { contract, leaveAccounts, canEdit } = data;
    const effectiveFromOptions = getEffectiveFromOptions(contract.validFrom, contract.validTo);
    const hasChangeErrors = changePreview === null || changePreview.errors.length > 0;

    return (
        <div>
            <NavbarTop items={breadCrumbs} sidebar={true} />
            <div className="p-6 space-y-6 max-w-5xl mx-auto">
                {/* Vertrags-Info */}
                <Card className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold">{contract.userName}</h2>
                            <p className="text-zinc-500">{contract.userEmail}</p>
                        </div>
                        <div className="text-right space-y-2">
                            {canEdit && (
                                <div className="space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => setIsContractDialogOpen(true)}>
                                        <BiEdit className="mr-1" /> Ändern
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => setIsTerminateDialogOpen(true)}>
                                        <BiTrash className="mr-1" /> Beenden
                                    </Button>
                                </div>
                            )}
                            <p className="font-semibold">{contract.groupName}</p>
                            <p className="text-sm px-2 py-1 bg-zinc-100 rounded-full inline-block dark:bg-zinc-800">
                                {contract.type === 'fixed_salary' ? 'Festanstellung' : 'Stundenbasis'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 border-t pt-4">
                        <div>
                            <p className="text-xs text-zinc-500 uppercase">Wochenstunden</p>
                            <p className="font-medium">{contract.weeklyHours} h</p>
                        </div>
                        {contract.type === 'hourly' && (
                            <div>
                                <p className="text-xs text-zinc-500 uppercase">Stundenlohn</p>
                                <p className="font-medium">{contract.hourlyRate} €</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-zinc-500 uppercase">Urlaub/Jahr</p>
                            <p className="font-medium">{contract.vacationDaysPerYear} Tage</p>
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500 uppercase">Arbeitstage</p>
                            <p className="font-medium">{formatWorkingDays(contract.workingDays)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500 uppercase">Gültig ab</p>
                            <p className="font-medium">{new Date(contract.validFrom).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500 uppercase">Gültig bis</p>
                            <p className="font-medium">
                                {contract.validTo ? new Date(contract.validTo).toLocaleDateString() : 'Unbefristet'}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Leave Accounts Sektion */}
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Jahresabschluss / Überträge</h3>
                    {canEdit && (
                        <Button onClick={handleOpenAdd} size="sm">
                            <BiPlus className="mr-1" /> Neu anlegen
                        </Button>
                    )}
                </div>

                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Jahr</TableHead>
                                <TableHead>Urlaubsanspruch</TableHead>
                                <TableHead>Resturlaub VJ</TableHead>
                                <TableHead>Überstunden VJ</TableHead>
                                {canEdit && <TableHead className="text-right">Aktionen</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leaveAccounts.map((acc) => (
                                <TableRow key={acc.id}>
                                    <TableCell className="font-bold">{acc.year}</TableCell>
                                    <TableCell>{acc.totalVacationDays} Tage</TableCell>
                                    <TableCell>{acc.remainingDaysFromLastYear} Tage</TableCell>
                                    <TableCell>{acc.overtimeCarryoverHours} h</TableCell>
                                    {canEdit && (
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(acc)}>
                                                <BiEdit />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500"
                                                onClick={() => handleDelete(acc.id)}
                                            >
                                                <BiTrash />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                            {leaveAccounts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={canEdit ? 5 : 4} className="text-center py-8 text-zinc-500">
                                        Keine Einträge vorhanden.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            {/* Dialog für Create/Edit Leave Account */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAccount?.id ? 'Eintrag bearbeiten' : 'Neuen Jahresabschluss anlegen'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="year">Jahr</Label>
                                <Input
                                    id="year"
                                    type="number"
                                    value={editingAccount?.year || ''}
                                    onChange={(e) => setEditingAccount({ ...editingAccount, year: parseInt(e.target.value, 10) })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="totalVacation">Urlaubsanspruch</Label>
                                <Input
                                    id="totalVacation"
                                    type="number"
                                    step="0.5"
                                    value={editingAccount?.totalVacationDays || ''}
                                    onChange={(e) =>
                                        setEditingAccount({ ...editingAccount, totalVacationDays: parseFloat(e.target.value) })
                                    }
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="remainingVacation">Resturlaub aus Vorjahr</Label>
                                <Input
                                    id="remainingVacation"
                                    type="number"
                                    step="0.5"
                                    value={editingAccount?.remainingDaysFromLastYear ?? ''}
                                    onChange={(e) =>
                                        setEditingAccount({
                                            ...editingAccount,
                                            remainingDaysFromLastYear: e.target.value === '' ? 0 : parseFloat(e.target.value),
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="overtime">Überstunden aus Vorjahr (h)</Label>
                                <Input
                                    id="overtime"
                                    type="number"
                                    step="0.01"
                                    value={editingAccount?.overtimeCarryoverHours || ''}
                                    onChange={(e) => setEditingAccount({ ...editingAccount, overtimeCarryoverHours: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Abbrechen
                            </Button>
                            <Button type="submit">Speichern</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog für Vertragsänderung */}
            <Dialog open={isContractDialogOpen} onOpenChange={setIsContractDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Vertrag ändern</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleContractUpdate} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="contract-type">Vertragsart</Label>
                                <Select
                                    value={contractFormData.type}
                                    onValueChange={(v) => setContractFormData({ ...contractFormData, type: v })}
                                >
                                    <SelectTrigger id="contract-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fixed_salary">Festanstellung</SelectItem>
                                        <SelectItem value="hourly">Stundenbasis</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="weekly-hours">Wochenstunden</Label>
                                <Input
                                    id="weekly-hours"
                                    type="number"
                                    value={contractFormData.weeklyHours}
                                    onChange={(e) => setContractFormData({ ...contractFormData, weeklyHours: parseFloat(e.target.value) })}
                                    required
                                />
                            </div>
                        </div>
                        {contractFormData.type === 'hourly' && (
                            <div className="space-y-2">
                                <Label htmlFor="hourly-rate">Stundenlohn (€)</Label>
                                <Input
                                    id="hourly-rate"
                                    type="number"
                                    step="0.01"
                                    value={contractFormData.hourlyRate}
                                    onChange={(e) => setContractFormData({ ...contractFormData, hourlyRate: e.target.value })}
                                    required
                                />
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="vacation-days">Urlaubstage / Jahr</Label>
                                <Input
                                    id="vacation-days"
                                    type="number"
                                    value={contractFormData.vacationDaysPerYear}
                                    onChange={(e) =>
                                        setContractFormData({ ...contractFormData, vacationDaysPerYear: parseInt(e.target.value, 10) })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="effective-from">Gültig ab</Label>
                                <Select
                                    value={contractFormData.effectiveFrom}
                                    onValueChange={(v) => setContractFormData({ ...contractFormData, effectiveFrom: v })}
                                >
                                    <SelectTrigger id="effective-from">
                                        <SelectValue placeholder="Kein Stichtag möglich" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {effectiveFromOptions.map((option) => (
                                            <SelectItem key={option} value={option}>
                                                {formatDate(option)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="working-days">Arbeitstage</Label>
                            <WorkingDaysSelect
                                id="working-days"
                                value={contractFormData.workingDays}
                                onChange={(workingDays) => setContractFormData({ ...contractFormData, workingDays })}
                            />
                            {contractFormData.workingDays.length === 0 && (
                                <p className="text-sm text-red-600">Bitte wähle mindestens einen Arbeitstag.</p>
                            )}
                        </div>
                        {previewError !== null && <p className="text-sm text-red-600">{previewError}</p>}
                        {changePreview !== null && changePreview.errors.length > 0 && (
                            <ul className="list-disc space-y-1 pl-5 text-sm text-red-600">
                                {changePreview.errors.map((error) => (
                                    <li key={error}>{error}</li>
                                ))}
                            </ul>
                        )}
                        {changePreview !== null && changePreview.errors.length === 0 && (
                            <div className="space-y-2 rounded-md border p-3 text-sm text-zinc-600 dark:text-zinc-300">
                                <p>
                                    Der bisherige Vertrag endet am{' '}
                                    {formatDate(format(subDays(parseISO(changePreview.effectiveFrom), 1), 'yyyy-MM-dd'))}. Ab dem{' '}
                                    {formatDate(changePreview.effectiveFrom)} gilt ein neuer Vertrag mit den geänderten Daten.
                                </p>
                                {changePreview.isRetroactive && (
                                    <p className="font-medium text-amber-600">
                                        Die Änderung ist rückwirkend. Soll und Gleitzeitsaldo ab dem Stichtag werden neu berechnet.
                                    </p>
                                )}
                                <p>
                                    Übernommen werden {changePreview.eventLogCount} Buchungen, {changePreview.absenceCount} Abwesenheiten
                                    (davon {changePreview.futureAbsenceCount} künftige) und {changePreview.holidayConfigCount}{' '}
                                    Feiertagsregeln
                                    {changePreview.leaveAccountYears.length > 0 &&
                                        `, außerdem die Jahreskonten ${changePreview.leaveAccountYears.join(', ')}`}
                                    . Die Stunden der Abwesenheiten werden aus den neuen Wochenstunden und Arbeitstagen berechnet.
                                </p>
                                {changePreview.removedAbsenceCount > 0 && (
                                    <p className="font-medium text-amber-600">
                                        {changePreview.removedAbsenceCount} Urlaubs- oder Krankheitstage fallen auf Tage, die keine
                                        Arbeitstage mehr sind. Sie werden gelöscht, Urlaubstage werden dadurch wieder frei.
                                    </p>
                                )}
                                {changePreview.uncoveredDates.length > 0 && (
                                    <p className="font-medium text-amber-600">
                                        Neue Arbeitstage direkt neben gebuchtem Urlaub, für die kein Urlaub gebucht ist:{' '}
                                        {changePreview.uncoveredDates.map(formatDate).join(', ')}. Hat die Person dort frei, muss der Urlaub
                                        nachgetragen werden.
                                    </p>
                                )}
                                <p>
                                    Jahreskonten bis {subDays(parseISO(changePreview.effectiveFrom), 1).getFullYear()} bleiben am bisherigen
                                    Vertrag und gelten weiter. Lege für diese Jahre kein zweites Jahreskonto am neuen Vertrag an, sonst
                                    zählt der Urlaub doppelt.
                                </p>
                                {contractFormData.vacationDaysPerYear !== contract.vacationDaysPerYear && (
                                    <p className="font-medium text-amber-600">
                                        Der Urlaubsanspruch im Jahreskonto wird nicht automatisch angepasst. Passe ihn bei Bedarf im
                                        Jahreskonto des bisherigen Vertrags an.
                                    </p>
                                )}
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsContractDialogOpen(false)}>
                                Abbrechen
                            </Button>
                            <Button type="submit" disabled={hasChangeErrors}>
                                Änderung speichern
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog für Vertrag beenden */}
            <Dialog open={isTerminateDialogOpen} onOpenChange={setIsTerminateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Vertrag beenden</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleTerminateContract} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="termination-date">Beenden zum Ende von</Label>
                            <Select value={terminationDate} onValueChange={setTerminationDate}>
                                <SelectTrigger id="termination-date">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={getEndOfMonth(-1)}>Letzter Monat ({getEndOfMonth(-1)})</SelectItem>
                                    <SelectItem value={getEndOfMonth(0)}>Dieser Monat ({getEndOfMonth(0)})</SelectItem>
                                    <SelectItem value={getEndOfMonth(1)}>Nächster Monat ({getEndOfMonth(1)})</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-sm text-red-500 font-medium">
                            Achtung: Dies setzt ein Enddatum für den Vertrag. Es wird kein neuer Vertrag erstellt.
                        </p>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsTerminateDialogOpen(false)}>
                                Abbrechen
                            </Button>
                            <Button type="submit" variant="destructive">
                                Vertrag beenden
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
