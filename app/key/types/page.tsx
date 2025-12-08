/* eslint-disable jsx-a11y/label-has-associated-control */

'use client';
import { type ReactElement, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface KeyType {
    id: string;
    keyNr: number;
    keyDescription: string;
}

export default function KeyTypesPage(): ReactElement {
    const [items, setItems] = useState<Array<KeyType>>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({ keyNr: '', keyDescription: '' });
    const [fillUp, setFillUp] = useState<{ id: string; qty: string }>({ id: '', qty: '' });

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/key/types');
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Fehler beim Laden');
            }
            setItems(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const onCreate = async (ev: React.FormEvent) => {
        ev.preventDefault();
        setError(null);
        try {
            const res = await fetch('/api/key/types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyNr: Number(form.keyNr), keyDescription: form.keyDescription }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Fehler beim Anlegen');
            }
            setForm({ keyNr: '', keyDescription: '' });
            load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
        }
    };

    const onFillUp = async (id: string, qty: string) => {
        setError(null);
        try {
            const res = await fetch(`/api/key/types/${id}/fill-up`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetQuantity: Number(qty) }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Fehler beim Auffüllen');
            }
            setFillUp({ id: '', qty: '' });
            alert(`Erzeugt: ${data.created?.length ?? 0} Schlüssel-Items`);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Schließungen</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Neue Schließung</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onCreate} className="flex flex-wrap gap-3 items-end">
                        <div className="grid gap-1">
                            <label className="text-sm text-muted-foreground">keyNr</label>
                            <Input value={form.keyNr} onChange={(e) => setForm((f) => ({ ...f, keyNr: e.target.value }))} required />
                        </div>
                        <div className="grid gap-1 min-w-56 flex-1">
                            <label className="text-sm text-muted-foreground">Beschreibung</label>
                            <Input
                                value={form.keyDescription}
                                onChange={(e) => setForm((f) => ({ ...f, keyDescription: e.target.value }))}
                                required
                            />
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
                                        <th className="py-2 pr-3">keyNr</th>
                                        <th className="py-2 pr-3">Beschreibung</th>
                                        <th className="py-2 pr-3">Auffüllen</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((t) => (
                                        <tr key={t.id} className="border-t">
                                            <td className="py-2 pr-3">{t.keyNr}</td>
                                            <td className="py-2 pr-3">{t.keyDescription}</td>
                                            <td className="py-2 pr-3">
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        placeholder="Zielmenge"
                                                        value={fillUp.id === t.id ? fillUp.qty : ''}
                                                        onChange={(e) => setFillUp({ id: t.id, qty: e.target.value })}
                                                        className="w-28"
                                                    />
                                                    <Button
                                                        type="button"
                                                        onClick={() => onFillUp(t.id, fillUp.id === t.id ? fillUp.qty : '0')}
                                                    >
                                                        Auffüllen
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
