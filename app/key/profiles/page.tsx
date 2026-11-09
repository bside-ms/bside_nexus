import type { ReactElement } from 'react';
import KeyPageShell from '@/components/key/KeyPageShell';
import KeyProfileFormDialog from '@/components/key/KeyProfileFormDialog';
import KeyProfileList from '@/components/key/KeyProfileList';
import { listKeyProfiles, listLinkableUsers } from '@/lib/db/keyActions';
import requireKeyPageAccess from '@/lib/key/requireKeyPageAccess';

export default async function KeyProfilesPage(): Promise<ReactElement> {
    await requireKeyPageAccess();
    const [profiles, users] = await Promise.all([listKeyProfiles(), listLinkableUsers()]);

    return (
        <KeyPageShell
            breadcrumbs={[{ title: 'Personen und Tresore' }]}
            title="Personen und Tresore"
            description="Profile für alle, die Schlüssel bekommen: Mitglieder, Externe und Schlüsseltresore."
            actions={<KeyProfileFormDialog users={users} />}
        >
            <KeyProfileList profiles={profiles} />
        </KeyPageShell>
    );
}
