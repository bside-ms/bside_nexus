'use client';
import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ActiveAssignment {
    assignmentId: string;
    userProfileId: string;
    keyItemId: string;
    receivedAt: string;
    keyNr: number;
    seqNumber: number;
    keyDescription: string;
    profileFirstName: string;
    profileLastName?: string | null;
    profileNumber?: number | null;
}

export default function ReturnPage(): ReactElement {
    const [rows, setRows] = useState<Array<ActiveAssignment>>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [protocolIds, setProtocolIds] = useState<Array<string> | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/key/assignments/active');
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Fehler beim Laden der aktiven Ausgaben');
            }
            setRows(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const allSelected = useMemo(() => rows.length > 0 && rows.every((r) => selected.has(r.assignmentId)), [rows, selected]);
    const toggleAll = () => {
        setSelected((prev) => {
            if (rows.length === 0) {
                return prev;
            }
            if (rows.every((r) => prev.has(r.assignmentId))) {
                return new Set<string>();
            }
            return new Set(rows.map((r) => r.assignmentId));
        });
    };

    const toggle = (id: string) => {
        setSelected((prev) => {
            const n = new Set(prev);
            if (n.has(id)) {
                n.delete(id);
            } else {
                n.add(id);
            }
            return n;
        });
    };

    const onReturn = async () => {
        setError(null);
        setProtocolIds(null);
        const ids = Array.from(selected);
        if (ids.length === 0) {
            setError('Bitte mindestens einen Eintrag auswählen');
            return;
        }
        try {
            const res = await fetch('/api/key/return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignmentIds: ids }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Fehler bei der Rückgabe');
            }
            setProtocolIds(data.protocolIds || []);
            setSelected(new Set());
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Rückgabe</h1>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Card>
                <CardHeader>
                    <CardTitle>Aktive Ausgaben</CardTitle>
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
                                            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                                        </th>
                                        <th className="py-2 pr-3">ProfileNr</th>
                                        <th className="py-2 pr-3">Name</th>
                                        <th className="py-2 pr-3">KeyId</th>
                                        <th className="py-2 pr-3">Beschreibung</th>
                                        <th className="py-2 pr-3">Ausgegeben am</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => (
                                        <tr key={r.assignmentId} className="border-t">
                                            <td className="py-2 pr-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(r.assignmentId)}
                                                    onChange={() => toggle(r.assignmentId)}
                                                />
                                            </td>
                                            <td className="py-2 pr-3">{r.profileNumber ?? ''}</td>
                                            <td className="py-2 pr-3">{`${r.profileFirstName} ${r.profileLastName ?? ''}`.trim()}</td>
                                            <td className="py-2 pr-3">{`${r.keyNr}-${r.seqNumber}`}</td>
                                            <td className="py-2 pr-3">{r.keyDescription}</td>
                                            <td className="py-2 pr-3">{new Date(r.receivedAt).toLocaleString('de-DE')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="mt-3">
                        <Button onClick={onReturn} disabled={selected.size === 0}>
                            Rückgabe durchführen
                        </Button>
                    </div>
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
