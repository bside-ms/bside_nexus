'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { Input } from '@/components/ui/input';
import type { KeyTypeListEntry } from '@/lib/db/keyActions';
import { formatKeyNr } from '@/lib/key/constants';
import { cn } from '@/lib/utils';

const KeyTypeTable = ({ keyTypes }: { keyTypes: Array<KeyTypeListEntry> }): ReactElement => {
    const [query, setQuery] = useState('');

    const visible = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (normalized === '') {
            return keyTypes;
        }
        return keyTypes.filter(
            (keyType) => formatKeyNr(keyType.keyNr).includes(normalized) || keyType.keyDescription.toLowerCase().includes(normalized),
        );
    }, [keyTypes, query]);

    return (
        <div className="space-y-4">
            <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Nummer oder Bezeichnung …"
                    className="pl-8"
                    aria-label="Schließungen durchsuchen"
                />
            </div>
            <div className="overflow-hidden rounded-lg border">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted text-muted-foreground">
                            <tr>
                                <th className="p-3">Nr.</th>
                                <th className="p-3">Bezeichnung</th>
                                <th className="p-3 text-right">Bestand</th>
                                <th className="p-3 text-right">Ausgegeben</th>
                                <th className="p-3 text-right">Verfügbar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((keyType) => (
                                <tr key={keyType.id} className="border-t hover:bg-muted/50">
                                    <td className="p-3 font-medium tabular-nums">{formatKeyNr(keyType.keyNr)}</td>
                                    <td className="p-3">
                                        <Link href={`/key/types/${keyType.id}`} className="font-medium hover:underline">
                                            {keyType.keyDescription}
                                        </Link>
                                    </td>
                                    <td className="p-3 text-right tabular-nums">{keyType.totalQuantity ?? '?'}</td>
                                    <td className="p-3 text-right tabular-nums">{keyType.issued}</td>
                                    <td
                                        className={cn(
                                            'p-3 text-right tabular-nums',
                                            keyType.available !== null && keyType.available < 0 && 'font-semibold text-destructive',
                                        )}
                                        title={
                                            keyType.available !== null && keyType.available < 0 ? 'Mehr ausgegeben als Bestand' : undefined
                                        }
                                    >
                                        {keyType.available ?? '?'}
                                    </td>
                                </tr>
                            ))}
                            {visible.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                                        {keyTypes.length === 0 ? 'Es gibt noch keine Schließungen.' : 'Keine Schließung passt zur Suche.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default KeyTypeTable;
