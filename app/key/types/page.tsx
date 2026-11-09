import type { ReactElement } from 'react';
import KeyPageShell from '@/components/key/KeyPageShell';
import KeyTypeFormDialog from '@/components/key/KeyTypeFormDialog';
import KeyTypeTable from '@/components/key/KeyTypeTable';
import { listKeyTypes } from '@/lib/db/keyActions';
import requireKeyPageAccess from '@/lib/key/requireKeyPageAccess';

export default async function KeyTypesPage(): Promise<ReactElement> {
    await requireKeyPageAccess();
    const keyTypes = await listKeyTypes();

    return (
        <KeyPageShell
            breadcrumbs={[{ title: 'Schließungen' }]}
            title="Schließungen"
            description="Schlüsselarten mit Bestand. Verfügbar ist, was nicht ausgegeben ist."
            actions={<KeyTypeFormDialog />}
        >
            <KeyTypeTable keyTypes={keyTypes} />
        </KeyPageShell>
    );
}
