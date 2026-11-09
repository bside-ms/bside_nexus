import Link from 'next/link';
import type { ReactElement } from 'react';
import KeyPageShell from '@/components/key/KeyPageShell';
import ProtocolTable from '@/components/key/ProtocolTable';
import { Button } from '@/components/ui/button';
import { listProtocols } from '@/lib/db/keyProtocolActions';
import requireKeyPageAccess from '@/lib/key/requireKeyPageAccess';

export default async function KeyProtocolsPage({ searchParams }: { searchParams: Promise<{ ohneScan?: string }> }): Promise<ReactElement> {
    await requireKeyPageAccess();
    const withoutScan = (await searchParams).ohneScan === '1';
    const protocols = await listProtocols({ withoutScan });

    return (
        <KeyPageShell
            breadcrumbs={[{ title: 'Protokolle' }]}
            title="Protokolle"
            description="Alle Ausgaben, Rückgaben und Verluste. Neue Protokolle legst du auf der Seite der Person oder des Tresors an."
            actions={
                <Button asChild variant="outline">
                    <Link href={withoutScan ? '/key/protocols' : '/key/protocols?ohneScan=1'}>
                        {withoutScan ? 'Alle anzeigen' : 'Nur ohne Scan'}
                    </Link>
                </Button>
            }
        >
            <ProtocolTable
                protocols={protocols}
                emptyText={withoutScan ? 'Zu allen Quittungen liegt ein unterschriebener Scan vor.' : 'Noch keine Protokolle.'}
            />
        </KeyPageShell>
    );
}
