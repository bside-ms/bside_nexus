'use client';

import { useMemo, useState } from 'react';
import { Search, Vault } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { KeyProfileListEntry } from '@/lib/db/keyActions';
import type { KeyProfileKind } from '@/lib/key/constants';

type KindFilter = 'all' | KeyProfileKind;

const FILTERS: Array<{ value: KindFilter; label: string }> = [
    { value: 'all', label: 'Alle' },
    { value: 'person', label: 'Personen' },
    { value: 'safe', label: 'Tresore' },
];

const matches = (profile: KeyProfileListEntry, query: string): boolean =>
    [profile.name, profile.emailAddress, profile.addressCity, profile.description, profile.profileNumber?.toString()]
        .filter((value): value is string => value !== null && value !== undefined)
        .some((value) => value.toLowerCase().includes(query));

const KeyProfileList = ({ profiles }: { profiles: Array<KeyProfileListEntry> }): ReactElement => {
    const [query, setQuery] = useState('');
    const [kind, setKind] = useState<KindFilter>('all');
    const [onlyHolders, setOnlyHolders] = useState(false);

    const visible = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return profiles.filter(
            (profile) =>
                (kind === 'all' || profile.profileKind === kind) &&
                (!onlyHolders || profile.keyCount + profile.transponderCount > 0) &&
                (normalized === '' || matches(profile, normalized)),
        );
    }, [profiles, query, kind, onlyHolders]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Name, Nummer, Ort …"
                        className="pl-8"
                        aria-label="Profile durchsuchen"
                    />
                </div>
                <div className="flex gap-1">
                    {FILTERS.map((filter) => (
                        <Button
                            key={filter.value}
                            size="sm"
                            variant={kind === filter.value ? 'default' : 'outline'}
                            onClick={() => setKind(filter.value)}
                        >
                            {filter.label}
                        </Button>
                    ))}
                </div>
                <Button size="sm" variant={onlyHolders ? 'default' : 'outline'} onClick={() => setOnlyHolders((value) => !value)}>
                    Nur mit Schlüsseln
                </Button>
            </div>

            <div className="overflow-hidden rounded-lg border">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted text-muted-foreground">
                            <tr>
                                <th className="p-3">Nr.</th>
                                <th className="p-3">Name</th>
                                <th className="hidden p-3 md:table-cell">Kontakt / Standort</th>
                                <th className="p-3 text-right">Schlüssel</th>
                                <th className="p-3 text-right">Transponder</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((profile) => (
                                <tr key={profile.id} className="border-t hover:bg-muted/50">
                                    <td className="p-3 text-muted-foreground tabular-nums">{profile.profileNumber ?? '–'}</td>
                                    <td className="p-3">
                                        <Link href={`/key/profiles/${profile.id}`} className="font-medium hover:underline">
                                            {profile.name}
                                        </Link>
                                        {profile.profileKind === 'safe' && (
                                            <Badge variant="secondary" className="ml-2">
                                                <Vault className="mr-1 size-3" />
                                                Tresor
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="hidden p-3 text-muted-foreground md:table-cell">
                                        {profile.profileKind === 'safe'
                                            ? (profile.description ?? '')
                                            : [profile.emailAddress, profile.phoneNumber]
                                                  .filter((value) => (value ?? '') !== '')
                                                  .join(' · ')}
                                    </td>
                                    <td className="p-3 text-right tabular-nums">{profile.keyCount > 0 ? profile.keyCount : '–'}</td>
                                    <td className="p-3 text-right tabular-nums">
                                        {profile.transponderCount > 0 ? profile.transponderCount : '–'}
                                    </td>
                                </tr>
                            ))}
                            {visible.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                                        {profiles.length === 0 ? 'Es gibt noch keine Profile.' : 'Kein Profil passt zur Suche.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <p className="text-sm text-muted-foreground">
                {visible.length} von {profiles.length} Profilen
            </p>
        </div>
    );
};

export default KeyProfileList;
