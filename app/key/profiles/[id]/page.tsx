import { KeyRound, TriangleAlert, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import ConfirmDeleteDialog from '@/components/key/ConfirmDeleteDialog';
import KeyPageShell from '@/components/key/KeyPageShell';
import KeyProfileFormDialog from '@/components/key/KeyProfileFormDialog';
import ProtocolTable from '@/components/key/ProtocolTable';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getKeyProfile, getProfileKind, getUserLabel, listLinkableUsers } from '@/lib/db/keyActions';
import { getProfileHoldings, listProtocols } from '@/lib/db/keyProtocolActions';
import { formatKeyNr, formatProfileName, KEY_PROFILE_KIND_LABELS } from '@/lib/key/constants';
import requireKeyPageAccess from '@/lib/key/requireKeyPageAccess';

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ created?: string }>;
}

const DetailRow = ({ label, value }: { label: string; value: string | null }): ReactElement | null =>
    value === null || value === '' ? null : (
        <div className="grid grid-cols-[8rem_1fr] gap-2 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-words whitespace-pre-line">{value}</dd>
        </div>
    );

export default async function KeyProfilePage({ params, searchParams }: PageProps): Promise<ReactElement> {
    await requireKeyPageAccess();
    const { id } = await params;
    const { created } = await searchParams;
    const profile = await getKeyProfile(id);
    if (profile === null) {
        notFound();
    }

    const [holdings, protocols, users, userLabel] = await Promise.all([
        getProfileHoldings(id),
        listProtocols({ userProfileId: id }),
        listLinkableUsers(),
        profile.userId === null ? Promise.resolve(null) : getUserLabel(profile.userId),
    ]);

    const kind = getProfileKind(profile);
    const isSafe = kind === 'safe';
    const name = formatProfileName(profile);
    const hasHoldings = holdings.keys.length > 0 || holdings.transponders.length > 0;
    const street = [profile.addressStreet, profile.addressHouseNumber].filter((part) => (part ?? '') !== '').join(' ');
    const city = [profile.addressZipCode, profile.addressCity].filter((part) => (part ?? '') !== '').join(' ');

    return (
        <KeyPageShell
            breadcrumbs={[{ title: 'Personen und Tresore', url: '/key/profiles' }, { title: name }]}
            title={name}
            description={
                <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant={isSafe ? 'secondary' : 'outline'}>{KEY_PROFILE_KIND_LABELS[kind]}</Badge>
                    {profile.profileNumber !== null && <Badge variant="outline">Profil-Nr. {profile.profileNumber}</Badge>}
                </div>
            }
            actions={
                <>
                    <KeyProfileFormDialog users={users} profile={profile} />
                    <ConfirmDeleteDialog
                        url={`/api/key/profiles/${profile.id}`}
                        title="Profil löschen"
                        description={`${name} wird aus der Liste entfernt. Protokolle bleiben erhalten.`}
                        successMessage="Das Profil wurde gelöscht."
                        errorMessage="Das Profil konnte nicht gelöscht werden."
                        redirectTo="/key/profiles"
                        disabled={hasHoldings}
                        disabledReason="Erst nach der Rückgabe aller Schlüssel möglich."
                    />
                </>
            }
        >
            {created !== undefined && (
                <Alert>
                    <AlertTitle>Quittungen angelegt: {created}</AlertTitle>
                    <AlertDescription>Die PDFs findest du unten bei den Protokollen.</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{isSafe ? 'Tresor' : 'Kontakt'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="space-y-2">
                            {isSafe ? (
                                <DetailRow label="Standort" value={profile.description ?? 'Kein Standort hinterlegt'} />
                            ) : (
                                <>
                                    <DetailRow label="Adresse" value={[street, city].filter((part) => part !== '').join('\n')} />
                                    <DetailRow label="E-Mail" value={profile.emailAddress} />
                                    <DetailRow label="Telefon" value={profile.phoneNumber} />
                                    <DetailRow label="Nexus-Account" value={userLabel ?? 'nicht verknüpft'} />
                                    <DetailRow label="Notiz" value={profile.description} />
                                </>
                            )}
                        </dl>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 space-y-0">
                        <div className="space-y-1.5">
                            <CardTitle className="text-lg">{isSafe ? 'Im Tresor' : 'Aktuell ausgegeben'}</CardTitle>
                            <CardDescription>Laut Protokollen.</CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm">
                                <Link href={`/key/profiles/${profile.id}/issue`}>
                                    <KeyRound className="mr-2 size-4" />
                                    {isSafe ? 'Hineinlegen' : 'Ausgeben'}
                                </Link>
                            </Button>
                            {hasHoldings && (
                                <>
                                    <Button asChild size="sm" variant="outline">
                                        <Link href={`/key/profiles/${profile.id}/return`}>
                                            <Undo2 className="mr-2 size-4" />
                                            {isSafe ? 'Herausnehmen' : 'Rückgabe'}
                                        </Link>
                                    </Button>
                                    <Button asChild size="sm" variant="outline">
                                        <Link href={`/key/profiles/${profile.id}/lost`}>
                                            <TriangleAlert className="mr-2 size-4" />
                                            Verlust
                                        </Link>
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!hasHoldings && <p className="text-sm text-muted-foreground">Keine Schlüssel ausgegeben.</p>}
                        {holdings.keys.length > 0 && (
                            <div className="overflow-hidden rounded-lg border">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted text-muted-foreground">
                                        <tr>
                                            <th className="p-3">Schließung</th>
                                            <th className="p-3 text-right">Anzahl</th>
                                            <th className="hidden p-3 sm:table-cell">Aus Protokoll</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {holdings.keys.map((holding) => (
                                            <tr key={holding.keyTypeId} className="border-t">
                                                <td className="p-3">
                                                    <Link href={`/key/types/${holding.keyTypeId}`} className="hover:underline">
                                                        <span className="font-medium tabular-nums">{formatKeyNr(holding.keyNr)}</span>{' '}
                                                        {holding.keyDescription}
                                                    </Link>
                                                </td>
                                                <td className="p-3 text-right tabular-nums">{holding.quantity}</td>
                                                <td className="hidden p-3 sm:table-cell">
                                                    {holding.issuances.map((issuance, index) => (
                                                        <span key={issuance.protocolId}>
                                                            {index > 0 && ', '}
                                                            <Link
                                                                href={`/key/protocols/${issuance.protocolId}`}
                                                                className="hover:underline"
                                                            >
                                                                {issuance.protocolNumber}
                                                            </Link>
                                                            {issuance.quantity > 1 && ` (${issuance.quantity})`}
                                                        </span>
                                                    ))}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {holdings.transponders.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Transponder laut Quittungen</p>
                                <ul className="space-y-1 text-sm">
                                    {holdings.transponders.map((transponder) => (
                                        <li key={transponder.serial}>
                                            <span className="font-medium">{transponder.serial}</span> {transponder.description}
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-xs text-muted-foreground">Maßgeblich ist wAppLoxx.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-3">
                <h2 className="text-lg font-semibold">Protokolle</h2>
                <ProtocolTable protocols={protocols} showRecipient={false} />
            </div>
        </KeyPageShell>
    );
}
