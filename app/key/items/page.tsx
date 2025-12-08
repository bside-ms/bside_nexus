/* eslint-disable jsx-a11y/label-has-associated-control */

'use client';
import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface KeyType {
    id: string;
    keyNr: number;
    keyDescription: string;
}
interface KeyItem {
    id: string;
    keyTypeId: string;
    seqNumber: number;
    status: 'active' | 'inactive' | 'lost' | 'broken' | 'destroyed';
    comment?: string | null;
}

const STATUSES = ['active', 'inactive', 'lost', 'broken', 'destroyed'] as const;

export default function KeyItemsPage(): ReactElement {
    const [types, setTypes] = useState<Array<KeyType>>([]);
    const [items, setItems] = useState<Array<KeyItem>>([]);
    const [filterTypeId, setFilterTypeId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createForm, setCreateForm] = useState<{ keyTypeId: string; seqNumber: string; comment: string }>({
        keyTypeId: '',
        seqNumber: '',
        comment: '',
    });

    const loadTypes = async () => {
        try {
            const res = await fetch('/api/key/types');
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Fehler beim Laden der Schließungen');
            }
            setTypes(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
        }
    };

    const loadItems = async (typeId?: string) => {
        setLoading(true);
        setError(null);
        try {
            const url = typeId ? `/api/key/items?keyTypeId=${encodeURIComponent(typeId)}` : '/api/key/items';
            const res = await fetch(url);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Fehler beim Laden der Schlüssel');
            }
            setItems(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTypes();
    }, []);

    useEffect(() => {
        loadItems(filterTypeId || undefined);
    }, [filterTypeId]);

    const typeById = useMemo(() => Object.fromEntries(types.map((t) => [t.id, t])), [types]);

    const onCreate = async (ev: React.FormEvent) => {
        ev.preventDefault();
        setError(null);
        try {
            const res = await fetch('/api/key/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keyTypeId: createForm.keyTypeId,
                    seqNumber: Number(createForm.seqNumber),
                    comment: createForm.comment || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Fehler beim Anlegen des Schlüssels');
            }
            setCreateForm({ keyTypeId: '', seqNumber: '', comment: '' });
            loadItems(filterTypeId || undefined);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
        }
    };

    const onChangeStatus = async (id: string, status: KeyItem['status']) => {
        setError(null);
        try {
            const res = await fetch(`/api/key/items/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Fehler beim Statuswechsel');
            }
            loadItems(filterTypeId || undefined);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Schlüssel</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filter</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3 items-center">
                        <label className="text-sm text-muted-foreground">Schließung</label>
                        <select
                            className="border rounded h-9 px-3 bg-background"
                            value={filterTypeId}
                            onChange={(e) => setFilterTypeId(e.target.value)}
                        >
                            <option value="">Alle Schließungen</option>
                            {types.map((t) => (
                                <option value={t.id} key={t.id}>
                                    {t.keyNr} – {t.keyDescription}
                                </option>
                            ))}
                        </select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Neues Schlüssel-Item</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onCreate} className="flex flex-wrap gap-3 items-end">
                        <div className="grid gap-1 min-w-56">
                            <label className="text-sm text-muted-foreground">Schließung</label>
                            <select
                                className="border rounded h-9 px-3 bg-background"
                                required
                                value={createForm.keyTypeId}
                                onChange={(e) => setCreateForm((f) => ({ ...f, keyTypeId: e.target.value }))}
                            >
                                <option value="" disabled>
                                    Bitte wählen…
                                </option>
                                {types.map((t) => (
                                    <option value={t.id} key={t.id}>
                                        {t.keyNr} – {t.keyDescription}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-1">
                            <label className="text-sm text-muted-foreground">seqNumber</label>
                            <Input
                                value={createForm.seqNumber}
                                onChange={(e) => setCreateForm((f) => ({ ...f, seqNumber: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="grid gap-1 min-w-56 flex-1">
                            <label className="text-sm text-muted-foreground">Kommentar</label>
                            <Input value={createForm.comment} onChange={(e) => setCreateForm((f) => ({ ...f, comment: e.target.value }))} />
                        </div>
                        <Button type="submit">Anlegen</Button>
                    </form>
                    {error && <p className="text-sm text-destructive mt-3">{error}</p>}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Liste</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Lade…</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-left text-muted-foreground">
                                    <tr>
                                        <th className="py-2 pr-3">Schließung</th>
                                        <th className="py-2 pr-3">KeyId</th>
                                        <th className="py-2 pr-3">Status</th>
                                        <th className="py-2 pr-3">Kommentar</th>
                                        <th className="py-2 pr-3">Aktionen</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((it) => {
                                        const t = typeById[it.keyTypeId];
                                        const keyId = t ? `${t.keyNr}-${it.seqNumber}` : it.seqNumber;
                                        return (
                                            <tr key={it.id} className="border-top border-t">
                                                <td className="py-2 pr-3">{t ? `${t.keyNr} – ${t.keyDescription}` : it.keyTypeId}</td>
                                                <td className="py-2 pr-3">{keyId}</td>
                                                <td className="py-2 pr-3">{it.status}</td>
                                                <td className="py-2 pr-3">{it.comment ?? ''}</td>
                                                <td className="py-2 pr-3">
                                                    <select
                                                        className="border rounded h-9 px-3 bg-background"
                                                        value={it.status}
                                                        onChange={(e) => onChangeStatus(it.id, e.target.value as KeyItem['status'])}
                                                    >
                                                        {STATUSES.map((s) => (
                                                            <option key={s} value={s}>
                                                                {s}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
