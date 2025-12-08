'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface UserProfile {
    id: string;
    profileNumber?: number | null;
    firstName: string;
    lastName?: string | null;
    emailAddress?: string | null;
    phoneNumber?: string | null;
    addressStreet?: string | null;
    addressHouseNumber?: string | null;
    addressZipCode?: string | null;
    addressCity?: string | null;
}

export default function ProfilesPage() {
    const [items, setItems] = useState<Array<UserProfile>>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        emailAddress: '',
        phoneNumber: '',
        addressStreet: '',
        addressHouseNumber: '',
        addressZipCode: '',
        addressCity: '',
    });

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/key/user-profiles');
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

    const onSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        setError(null);
        const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v || null]));
        try {
            const res = await fetch('/api/key/user-profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Fehler beim Anlegen');
            }
            setForm({
                firstName: '',
                lastName: '',
                emailAddress: '',
                phoneNumber: '',
                addressStreet: '',
                addressHouseNumber: '',
                addressZipCode: '',
                addressCity: '',
            });
            load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Neues Profil anlegen</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="grid gap-3 max-w-xl">
                        <div className="grid gap-1">
                            <label className="text-sm text-muted-foreground">Vorname*</label>
                            <Input
                                value={form.firstName}
                                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="grid gap-1">
                            <label className="text-sm text-muted-foreground">Nachname</label>
                            <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
                        </div>
                        <div className="grid gap-1">
                            <label className="text-sm text-muted-foreground">E-Mail</label>
                            <Input
                                type="email"
                                value={form.emailAddress}
                                onChange={(e) => setForm((f) => ({ ...f, emailAddress: e.target.value }))}
                            />
                        </div>
                        <div className="grid gap-1">
                            <label className="text-sm text-muted-foreground">Telefon</label>
                            <Input value={form.phoneNumber} onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))} />
                        </div>
                        <div className="grid gap-1">
                            <label className="text-sm text-muted-foreground">Straße</label>
                            <Input value={form.addressStreet} onChange={(e) => setForm((f) => ({ ...f, addressStreet: e.target.value }))} />
                        </div>
                        <div className="grid gap-1">
                            <label className="text-sm text-muted-foreground">Hausnummer</label>
                            <Input
                                value={form.addressHouseNumber}
                                onChange={(e) => setForm((f) => ({ ...f, addressHouseNumber: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1">
                                <label className="text-sm text-muted-foreground">PLZ</label>
                                <Input
                                    value={form.addressZipCode}
                                    onChange={(e) => setForm((f) => ({ ...f, addressZipCode: e.target.value }))}
                                />
                            </div>
                            <div className="grid gap-1">
                                <label className="text-sm text-muted-foreground">Ort</label>
                                <Input value={form.addressCity} onChange={(e) => setForm((f) => ({ ...f, addressCity: e.target.value }))} />
                            </div>
                        </div>
                        <div className="pt-2">
                            <Button type="submit">Anlegen</Button>
                        </div>
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
                                        <th className="py-2 pr-3">ProfileNr</th>
                                        <th className="py-2 pr-3">Name</th>
                                        <th className="py-2 pr-3">Mail</th>
                                        <th className="py-2 pr-3">Telefon</th>
                                        <th className="py-2 pr-3">Adresse</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((p) => (
                                        <tr key={p.id} className="border-t">
                                            <td className="py-2 pr-3">{p.profileNumber ?? ''}</td>
                                            <td className="py-2 pr-3">{`${p.firstName} ${p.lastName ?? ''}`.trim()}</td>
                                            <td className="py-2 pr-3">{p.emailAddress ?? ''}</td>
                                            <td className="py-2 pr-3">{p.phoneNumber ?? ''}</td>
                                            <td className="py-2 pr-3">
                                                {[p.addressStreet, p.addressHouseNumber].filter(Boolean).join(' ')}
                                                {', '}
                                                {[p.addressZipCode, p.addressCity].filter(Boolean).join(' ')}
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
