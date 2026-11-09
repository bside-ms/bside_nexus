import Link from 'next/link';
import type { ReactElement } from 'react';
import KeyPageShell from '@/components/key/KeyPageShell';
import ProtocolTable from '@/components/key/ProtocolTable';
import { Button } from '@/components/ui/button';
import { listProtocols } from '@/lib/db/keyProtocolActions';
import requireKeyPageAccess from '@/lib/key/requireKeyPageAccess';

type Filter = 'all' | 'ohneScan' | 'unsicher';

const FILTERS: Array<{ value: Filter; label: string; href: string; empty: string }> = [
    { value: 'all', label: 'Alle', href: '/key/protocols', empty: 'Noch keine Protokolle.' },
    { value: 'unsicher', label: 'Unsicher', href: '/key/protocols?unsicher=1', empty: 'Kein Protokoll ist als unsicher markiert.' },
    {
        value: 'ohneScan',
        label: 'Ohne Scan',
        href: '/key/protocols?ohneScan=1',
        empty: 'Zu allen Quittungen liegt ein unterschriebener Scan vor.',
    },
];

export default async function KeyProtocolsPage({
    searchParams,
}: {
    searchParams: Promise<{ ohneScan?: string; unsicher?: string }>;
}): Promise<ReactElement> {
    await requireKeyPageAccess();
    const params = await searchParams;
    let filter: Filter = 'all';
    if (params.unsicher === '1') {
        filter = 'unsicher';
    } else if (params.ohneScan === '1') {
        filter = 'ohneScan';
    }
    const protocols = await listProtocols({ withoutScan: filter === 'ohneScan', uncertain: filter === 'unsicher' });

    return (
        <KeyPageShell
            breadcrumbs={[{ title: 'Protokolle' }]}
            title="Protokolle"
            description="Alle Ausgaben, Rückgaben und Verluste. Neue Protokolle legst du auf der Seite der Person oder des Tresors an."
            actions={
                <div className="flex gap-1">
                    {FILTERS.map((entry) => (
                        <Button key={entry.value} asChild size="sm" variant={filter === entry.value ? 'default' : 'outline'}>
                            <Link href={entry.href}>{entry.label}</Link>
                        </Button>
                    ))}
                </div>
            }
        >
            <ProtocolTable protocols={protocols} emptyText={FILTERS.find((entry) => entry.value === filter)?.empty} />
        </KeyPageShell>
    );
}
