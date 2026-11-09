import { FileDown } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import CancelProtocolDialog from '@/components/key/CancelProtocolDialog';
import KeyPageShell from '@/components/key/KeyPageShell';
import ProtocolScans from '@/components/key/ProtocolScans';
import ProtocolTypeBadge from '@/components/key/ProtocolTypeBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProtocolDetails } from '@/lib/db/keyProtocolActions';
import { listProtocolScans } from '@/lib/db/keyProtocolFileActions';
import {
    formatKeyNr,
    formatProtocolDate,
    KEY_DELETION_KIND_LABELS,
    KEY_LINE_TYPE_LABELS,
    KEY_PROTOCOL_TYPE_LABELS,
    toKeyDeletionKind,
} from '@/lib/key/constants';
import requireKeyPageAccess from '@/lib/key/requireKeyPageAccess';
import { isNextcloudConfigured } from '@/lib/nextcloud/webdav';

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ created?: string }>;
}

const Row = ({ label, children }: { label: string; children: ReactElement | string | null }): ReactElement => (
    <div className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="break-words">{children}</dd>
    </div>
);

export default async function KeyProtocolPage({ params, searchParams }: PageProps): Promise<ReactElement> {
    await requireKeyPageAccess();
    const { id } = await params;
    const { created } = await searchParams;
    const details = await getProtocolDetails(id);
    if (details === null) {
        notFound();
    }

    const { protocol, protocolType, profileKind, items, followUps } = details;
    const scans = await listProtocolScans(protocol.id);
    const isCancelled = protocol.deletedAt !== null;
    const deletionKind = isCancelled ? toKeyDeletionKind(protocol.deletionKind) : null;
    const hasReceipt = profileKind === 'person';
    const recipient = protocol.recipient;

    return (
        <KeyPageShell
            breadcrumbs={[{ title: 'Protokolle', url: '/key/protocols' }, { title: protocol.protocolNumber }]}
            title={`${KEY_PROTOCOL_TYPE_LABELS[protocolType]} ${protocol.protocolNumber}`}
            description={
                <div className="mt-1">
                    <ProtocolTypeBadge type={protocolType} deletionKind={deletionKind} />
                </div>
            }
            actions={
                isCancelled ? undefined : (
                    <>
                        {hasReceipt && (
                            <Button asChild>
                                <a href={`/api/key/protocols/${protocol.id}/pdf`}>
                                    <FileDown className="mr-2 size-4" />
                                    Quittung (PDF)
                                </a>
                            </Button>
                        )}
                        <CancelProtocolDialog protocolId={protocol.id} protocolNumber={protocol.protocolNumber} />
                    </>
                )
            }
        >
            {created !== undefined && !isCancelled && (
                <Alert>
                    <AlertTitle>Protokoll {protocol.protocolNumber} angelegt</AlertTitle>
                    <AlertDescription>
                        {hasReceipt
                            ? 'Lade die Quittung herunter, drucke sie aus und lass sie unterschreiben.'
                            : 'Für dieses Protokoll gibt es keine Quittung zum Unterschreiben.'}
                    </AlertDescription>
                </Alert>
            )}
            {deletionKind !== null && (
                <Alert variant="destructive">
                    <AlertTitle>{KEY_DELETION_KIND_LABELS[deletionKind]}</AlertTitle>
                    <AlertDescription>{protocol.deletionReason ?? 'Ohne Begründung.'}</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{protocolType === 'issuance' ? 'Empfang durch' : 'Rückgabe durch'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="space-y-2">
                            <Row label="Name">
                                <Link href={`/key/profiles/${protocol.userProfileId}`} className="hover:underline">
                                    {recipient.name}
                                </Link>
                            </Row>
                            <Row label="Profil-Nr.">{recipient.profileNumber === null ? null : String(recipient.profileNumber)}</Row>
                            <Row label="Adresse">{recipient.address}</Row>
                            <Row label="E-Mail">{recipient.mail}</Row>
                            <Row label="Telefon">{recipient.phone}</Row>
                        </dl>
                        <p className="mt-3 text-xs text-muted-foreground">Daten zum Zeitpunkt des Protokolls.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Protokoll</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="space-y-2">
                            <Row label="Datum">{formatProtocolDate(protocol.protocolDate)}</Row>
                            <Row label={protocolType === 'issuance' ? 'Übergabe durch' : 'Empfang durch'}>{protocol.issuerName ?? '–'}</Row>
                            <Row label="Notiz">{protocol.comment}</Row>
                            <Row label="Original-Datei">{protocol.sourceFile}</Row>
                            {followUps.length > 0 ? (
                                <Row label="Folgeprotokolle">
                                    <span>
                                        {followUps.map((followUp, index) => (
                                            <span key={followUp.id}>
                                                {index > 0 && ', '}
                                                <Link href={`/key/protocols/${followUp.id}`} className="hover:underline">
                                                    {KEY_PROTOCOL_TYPE_LABELS[followUp.protocolType]} {followUp.protocolNumber}
                                                </Link>
                                            </span>
                                        ))}
                                    </span>
                                </Row>
                            ) : null}
                        </dl>
                    </CardContent>
                </Card>
            </div>

            <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-left text-sm">
                    <thead className="bg-muted text-muted-foreground">
                        <tr>
                            <th className="p-3">Nummer</th>
                            <th className="p-3">Anwendung für</th>
                            <th className="p-3">{protocolType === 'issuance' ? 'Art' : 'Übergabe'}</th>
                            <th className="p-3 text-right">Anzahl</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.position} className="border-t">
                                <td className="p-3 font-medium tabular-nums">
                                    {item.lineType === 'transponder' || item.keyTypeId === null ? (
                                        (item.transponderSerial ?? '–')
                                    ) : (
                                        <Link href={`/key/types/${item.keyTypeId}`} className="hover:underline">
                                            {item.keyNr === null ? '?' : formatKeyNr(item.keyNr)}
                                        </Link>
                                    )}
                                </td>
                                <td className="p-3">{item.description}</td>
                                <td className="p-3">
                                    {protocolType === 'issuance' && KEY_LINE_TYPE_LABELS[item.lineType]}
                                    {protocolType !== 'issuance' && item.issuanceProtocolId !== null && (
                                        <Link href={`/key/protocols/${item.issuanceProtocolId}`} className="hover:underline">
                                            {item.issuanceProtocolNumber}
                                        </Link>
                                    )}
                                    {protocolType !== 'issuance' && item.issuanceProtocolId === null && '–'}
                                </td>
                                <td className="p-3 text-right tabular-nums">{item.quantity}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {hasReceipt && (
                <ProtocolScans
                    protocolId={protocol.id}
                    protocolDate={protocol.protocolDate}
                    isConfigured={isNextcloudConfigured()}
                    scans={scans.map((scan) => ({
                        id: scan.id,
                        fileName: scan.filePath.split('/').pop() ?? scan.filePath,
                        uploadedAt: scan.uploadedAt.toISOString(),
                        uploadedByName: scan.uploadedByName,
                    }))}
                />
            )}
        </KeyPageShell>
    );
}
