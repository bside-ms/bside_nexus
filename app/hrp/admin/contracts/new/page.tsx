'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { toast } from 'sonner';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Group } from '@/db/schema';
import type { GroupMember } from '@/lib/db/groupActions';

interface GroupWithMembers {
    group: Group;
    members: Array<GroupMember>;
}

export default function NewContractPage(): ReactElement {
    const router = useRouter();

    // States für Daten
    const [data, setData] = useState<Array<GroupWithMembers>>([]);
    const [selectedGroupMembers, setSelectedGroupMembers] = useState<Array<GroupMember>>([]);

    // Form States
    const [formData, setFormData] = useState({
        userId: '',
        employerGroupId: '',
        type: 'fixed_salary',
        weeklyHours: 40,
        vacationDaysPerYear: 30,
        validFrom: '',
    });

    // Lade Gruppen & Mitglieder beim Start
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/hrp/groups');
                const result = await res.json();
                if (result.success) {
                    setData(result.data);
                } else {
                    toast.error('Fehler beim Laden der Gruppen');
                }
            } catch (error) {
                console.error('Fetch error:', error);
                toast.error('Netzwerkfehler beim Laden der Daten');
            }
        };

        fetchData();
    }, []);

    // Update members when group changes
    const handleGroupChange = (groupId: string) => {
        const groupData = data.find((g) => g.group.id === groupId);
        if (groupData) {
            setSelectedGroupMembers(groupData.members);
            setFormData({ ...formData, employerGroupId: groupId, userId: '' }); // Reset user when group changes
        } else {
            setSelectedGroupMembers([]);
            setFormData({ ...formData, employerGroupId: '', userId: '' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/hrp/contracts', {
            method: 'POST',
            body: JSON.stringify(formData),
        });

        if (res.ok) {
            toast.success('Vertrag angelegt');
            router.push('/hrp/admin/contracts');
        } else {
            toast.error('Fehler beim Speichern');
        }
    };

    const breadCrumbs = [
        { title: 'Zeiterfassung', url: '/hrp' },
        { title: 'Administration', url: '/hrp/admin' },
        { title: 'Verträge', url: '/hrp/admin/contracts' },
        { title: 'Neuer Vertrag', active: true },
    ];

    return (
        <div>
            <NavbarTop items={breadCrumbs} sidebar={true} />
            <div className="max-w-2xl mx-auto p-6">
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4">Neuen Arbeitsvertrag anlegen</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Gruppen Auswahl */}
                        <div className="space-y-2">
                            <label htmlFor="group-select" className="text-sm font-medium">
                                Arbeitgeber (Körperschaft)
                            </label>
                            <Select onValueChange={handleGroupChange}>
                                <SelectTrigger id="group-select">
                                    <SelectValue placeholder="Wähle Körperschaft" />
                                </SelectTrigger>
                                <SelectContent>
                                    {data.map((item) => (
                                        <SelectItem key={item.group.id} value={item.group.id}>
                                            {item.group.displayName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* User Auswahl */}
                        <div className="space-y-2">
                            <label htmlFor="user-select" className="text-sm font-medium">
                                Mitarbeiter*in
                            </label>
                            <Select
                                value={formData.userId}
                                disabled={!formData.employerGroupId}
                                onValueChange={(v) => setFormData({ ...formData, userId: v })}
                            >
                                <SelectTrigger id="user-select">
                                    <SelectValue placeholder={formData.employerGroupId ? 'Wähle Person' : 'Zuerst Körperschaft wählen'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {selectedGroupMembers.map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.displayName || u.username} - (@{u.username})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="contract-type-select" className="text-sm font-medium">
                                    Vertragsart
                                </label>
                                <Select defaultValue="fixed_salary" onValueChange={(v) => setFormData({ ...formData, type: v })}>
                                    <SelectTrigger id="contract-type-select">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fixed_salary">Festanstellung</SelectItem>
                                        <SelectItem value="hourly">Stundenbasis (Minijob/Gastro)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="hours" className="text-sm font-medium">
                                    Wochenstunden
                                </label>
                                <Input
                                    id="hours"
                                    type="number"
                                    value={formData.weeklyHours}
                                    onChange={(e) => setFormData({ ...formData, weeklyHours: parseFloat(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="date-from" className="text-sm font-medium">
                                Gültig ab
                            </label>
                            <Input
                                id="date-from"
                                type="date"
                                required
                                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                            />
                        </div>

                        <Button type="submit" className="w-full">
                            Vertrag speichern
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
}
