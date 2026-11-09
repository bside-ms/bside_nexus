import type { ReactElement } from 'react';
import KeyPageShell from '@/components/key/KeyPageShell';
import ProtocolTable from '@/components/key/ProtocolTable';
import { listProtocols } from '@/lib/db/keyProtocolActions';
import requireKeyPageAccess from '@/lib/key/requireKeyPageAccess';

export default async function KeyProtocolsPage(): Promise<ReactElement> {
    await requireKeyPageAccess();
    const protocols = await listProtocols();

    return (
        <KeyPageShell
            breadcrumbs={[{ title: 'Protokolle' }]}
            title="Protokolle"
            description="Alle Ausgaben, Rückgaben und Verluste. Neue Protokolle legst du auf der Seite der Person oder des Tresors an."
        >
            <ProtocolTable protocols={protocols} />
        </KeyPageShell>
    );
}
