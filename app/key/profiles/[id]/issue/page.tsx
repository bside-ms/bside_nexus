import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import IssueForm from '@/components/key/IssueForm';
import KeyPageShell from '@/components/key/KeyPageShell';
import { getKeyProfile, getProfileKind, listKeyTypes } from '@/lib/db/keyActions';
import { formatProfileName } from '@/lib/key/constants';
import requireKeyPageAccess from '@/lib/key/requireKeyPageAccess';

export default async function KeyIssuePage({ params }: { params: Promise<{ id: string }> }): Promise<ReactElement> {
    await requireKeyPageAccess();
    const { id } = await params;
    const profile = await getKeyProfile(id);
    if (profile === null) {
        notFound();
    }
    const keyTypes = await listKeyTypes();
    const name = formatProfileName(profile);
    const isSafe = getProfileKind(profile) === 'safe';

    return (
        <KeyPageShell
            breadcrumbs={[
                { title: 'Personen und Tresore', url: '/key/profiles' },
                { title: name, url: `/key/profiles/${id}` },
                { title: isSafe ? 'Hineinlegen' : 'Ausgabe' },
            ]}
            title={isSafe ? `In den Tresor legen: ${name}` : `Schlüssel ausgeben an ${name}`}
            description={
                isSafe
                    ? undefined
                    : 'Nach dem Speichern kannst du die Quittung als PDF herunterladen, ausdrucken und unterschreiben lassen.'
            }
        >
            {keyTypes.length === 0 ? (
                <p className="text-muted-foreground">Lege zuerst unter „Schließungen“ die Schlüsselarten an.</p>
            ) : (
                <IssueForm profileId={id} isSafe={isSafe} keyTypes={keyTypes} />
            )}
        </KeyPageShell>
    );
}
