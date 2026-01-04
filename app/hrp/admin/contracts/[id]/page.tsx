'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { BiEdit, BiPlus, BiTrash } from 'react-icons/bi';
import { toast } from 'sonner';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { HrpYearlyEntry } from '@/db/schema';
import type { ContractDetails } from '@/lib/db/hrpAdminActions';

// Hilfsfunktion für Monatsende-Daten
const getEndOfMonth = (offsetMonths: number): string => {
    const d = new Date();
    d.setMonth(d.getMonth() + offsetMonths + 1);
    d.setDate(0);
    return d.toISOString().split('T')[0]!;
};

export default function ContractDetailPage(): ReactElement {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const contractId = params?.id;

    const [data, setData] = useState<{ contract: ContractDetails; leaveAccounts: Array<HrpYearlyEntry> } | null>(null);
    const [loading, setLoading] = useState(true);

    // Dialog State für Leave Accounts
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Partial<HrpYearlyEntry> | null>(null);

    // Dialog State für Vertragsänderung
    const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
    const [contractFormData, setContractFormData] = useState({
        type: '',
        weeklyHours: 0,
        vacationDaysPerYear: 0,
        changeDate: '',
    });

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
                    vacationDaysPerYear: result.data.contract.vacationDaysPerYear,
                    changeDate: getEndOfMonth(0), // Default: Ende diesen Monats
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

    const handleContractUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/hrp/contracts/${contractId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    ...contractFormData,
                    workingDays: data?.contract.workingDays || [1, 2, 3, 4, 5],
                }),
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

    const { contract, leaveAccounts } = data;

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
                            <div className="space-x-2">
                                <Button variant="outline" size="sm" onClick={() => setIsContractDialogOpen(true)}>
                                    <BiEdit className="mr-1" /> Ändern
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => setIsTerminateDialogOpen(true)}>
                                    <BiTrash className="mr-1" /> Beenden
                                </Button>
                            </div>
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
                        <div>
                            <p className="text-xs text-zinc-500 uppercase">Urlaub/Jahr</p>
                            <p className="font-medium">{contract.vacationDaysPerYear} Tage</p>
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
                    <Button onClick={handleOpenAdd} size="sm">
                        <BiPlus className="mr-1" /> Neu anlegen
                    </Button>
                </div>

                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Jahr</TableHead>
                                <TableHead>Urlaubsanspruch</TableHead>
                                <TableHead>Resturlaub VJ</TableHead>
                                <TableHead>Überstunden VJ</TableHead>
                                <TableHead className="text-right">Aktionen</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leaveAccounts.map((acc) => (
                                <TableRow key={acc.id}>
                                    <TableCell className="font-bold">{acc.year}</TableCell>
                                    <TableCell>{acc.totalVacationDays} Tage</TableCell>
                                    <TableCell>{acc.remainingDaysFromLastYear} Tage</TableCell>
                                    <TableCell>{acc.overtimeCarryoverHours} h</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(acc)}>
                                            <BiEdit />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(acc.id)}>
                                            <BiTrash />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {leaveAccounts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
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
                                <Label htmlFor="change-date">Änderung zum Ende von</Label>
                                <Select
                                    value={contractFormData.changeDate}
                                    onValueChange={(v) => setContractFormData({ ...contractFormData, changeDate: v })}
                                >
                                    <SelectTrigger id="change-date">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={getEndOfMonth(-1)}>Letzter Monat ({getEndOfMonth(-1)})</SelectItem>
                                        <SelectItem value={getEndOfMonth(0)}>Dieser Monat ({getEndOfMonth(0)})</SelectItem>
                                        <SelectItem value={getEndOfMonth(1)}>Nächster Monat ({getEndOfMonth(1)})</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <p className="text-xs text-zinc-500 italic">
                            Hinweis: Der aktuelle Vertrag wird zum gewählten Datum beendet. Ein neuer Vertrag mit den geänderten Daten wird
                            am Folgetag gültig.
                        </p>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsContractDialogOpen(false)}>
                                Abbrechen
                            </Button>
                            <Button type="submit">Änderung speichern</Button>
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
