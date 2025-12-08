'use client';
import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface UserProfile {
    id: string;
    profileNumber?: number | null;
    firstName: string;
    lastName?: string | null;
}

interface AvailableItem {
    id: string;
    keyTypeId: string;
    seqNumber: number;
    status: string;
    keyNr: number;
    keyDescription: string;
}

export default function IssuancePage(): ReactElement {
    const [profiles, setProfiles] = useState<Array<UserProfile>>([]);
    const [q, setQ] = useState('');
    const [selectedProfileId, setSelectedProfileId] = useState<string>('');

    const [items, setItems] = useState<Array<AvailableItem>>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [protocolIds, setProtocolIds] = useState<Array<string> | null>(null);

    const loadProfiles = async (query?: string) => {
        try {
            const url = query ? `/api/key/user-profiles?q=${encodeURIComponent(query)}` : '/api/key/user-profiles';
            const res = await fetch(url);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Fehler beim Laden der Profile');
            }
            setProfiles(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
        }
    };

    const loadItems = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/key/available-items');
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Fehler beim Laden der verfügbaren Schlüssel');
            }
            setItems(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfiles();
        loadItems();
    }, []);

    const toggleSelect = (id: string) => {
        setSelectedItemIds((prev) => {
            const n = new Set(prev);
            if (n.has(id)) {
                n.delete(id);
            } else {
                n.add(id);
            }
            return n;
        });
    };

    const allSelected = useMemo(() => items.length > 0 && items.every((i) => selectedItemIds.has(i.id)), [items, selectedItemIds]);
    const toggleSelectAll = () => {
        setSelectedItemIds((prev) => {
            if (items.length === 0) {
                return prev;
            }
            if (items.every((i) => prev.has(i.id))) {
                return new Set<string>();
            }
            return new Set(items.map((i) => i.id));
        });
    };

    const onIssue = async () => {
        setError(null);
        setProtocolIds(null);
        if (!selectedProfileId) {
            setError('Bitte ein Profil auswählen');
            return;
        }
        if (selectedItemIds.size === 0) {
            setError('Bitte mindestens einen Schlüssel auswählen');
            return;
        }
        try {
            const res = await fetch('/api/key/issuance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userProfileId: selectedProfileId, keyItemIds: Array.from(selectedItemIds) }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Fehler bei der Ausgabe');
            }
            setProtocolIds(data.protocolIds || []);
            setSelectedItemIds(new Set());
            await loadItems();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Ausgabe</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Profil wählen</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2 items-center mb-3">
                        <Input placeholder="Suche (optional)" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
                        <Button type="button" onClick={() => loadProfiles(q)}>
                            Suchen
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setQ('');
                                loadProfiles();
                            }}
                        >
                            Alle
                        </Button>
                    </div>
                    <select
                        className="border rounded h-9 px-3 bg-background"
                        value={selectedProfileId}
                        onChange={(e) => setSelectedProfileId(e.target.value)}
                    >
                        <option value="">– Profil auswählen –</option>
                        {profiles.map((p) => (
                            <option value={p.id} key={p.id}>
                                {p.profileNumber !== null ? `#${p.profileNumber} ` : ''}
                                {`${p.firstName} ${p.lastName ?? ''}`.trim()}
                            </option>
                        ))}
                    </select>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Verfügbare Schlüssel</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Lade…</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-left text-muted-foreground">
                                    <tr>
                                        <th className="py-2 pr-3">
                                            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                                        </th>
                                        <th className="py-2 pr-3">KeyId</th>
                                        <th className="py-2 pr-3">Schließung</th>
                                        <th className="py-2 pr-3">Beschreibung</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((it) => (
                                        <tr key={it.id} className="border-t">
                                            <td className="py-2 pr-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItemIds.has(it.id)}
                                                    onChange={() => toggleSelect(it.id)}
                                                />
                                            </td>
                                            <td className="py-2 pr-3">{`${it.keyNr}-${it.seqNumber}`}</td>
                                            <td className="py-2 pr-3">{it.keyNr}</td>
                                            <td className="py-2 pr-3">{it.keyDescription}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="mt-3">
                        <Button onClick={onIssue} disabled={!selectedProfileId || selectedItemIds.size === 0}>
                            Ausgeben
                        </Button>
                    </div>
                    {error && <p className="text-sm text-destructive mt-3">{error}</p>}
                </CardContent>
            </Card>

            {protocolIds && (
                <Card>
                    <CardHeader>
                        <CardTitle>Quittungen</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc ml-5 text-sm">
                            {protocolIds.map((pid) => (
                                <li key={pid}>
                                    ProtocolId: {pid} –{' '}
                                    <a className="underline" href={`/api/key/protocols/${pid}/pdf`} target="_blank" rel="noreferrer">
                                        PDF herunterladen
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
