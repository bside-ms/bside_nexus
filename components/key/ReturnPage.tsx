import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import KeyPageShell from '@/components/key/KeyPageShell';
import ReturnForm from '@/components/key/ReturnForm';
import { getKeyProfile, getProfileKind } from '@/lib/db/keyActions';
import { getProfileHoldings } from '@/lib/db/keyProtocolActions';
import { formatProfileName } from '@/lib/key/constants';
import requireKeyPageAccess from '@/lib/key/requireKeyPageAccess';

// Shared by /return and /lost.
const ReturnPage = async ({ profileId, mode }: { profileId: string; mode: 'return' | 'lost' }): Promise<ReactElement> => {
    await requireKeyPageAccess();
    const profile = await getKeyProfile(profileId);
    if (profile === null) {
        notFound();
    }
    const holdings = await getProfileHoldings(profileId);
    const name = formatProfileName(profile);
    const isSafe = getProfileKind(profile) === 'safe';
    let label = 'Verlust';
    if (mode === 'return') {
        label = isSafe ? 'Herausnehmen' : 'Rückgabe';
    }

    return (
        <KeyPageShell
            breadcrumbs={[
                { title: 'Personen und Tresore', url: '/key/profiles' },
                { title: name, url: `/key/profiles/${profileId}` },
                { title: label },
            ]}
            title={`${label}: ${name}`}
        >
            {holdings.keys.length === 0 && holdings.transponders.length === 0 ? (
                <p className="text-muted-foreground">
                    Laut Protokollen hat {name} keine Schlüssel.{' '}
                    <Link href={`/key/profiles/${profileId}`} className="underline">
                        Zurück zum Profil
                    </Link>
                </p>
            ) : (
                <ReturnForm profileId={profileId} mode={mode} holdings={holdings} />
            )}
        </KeyPageShell>
    );
};

export default ReturnPage;
