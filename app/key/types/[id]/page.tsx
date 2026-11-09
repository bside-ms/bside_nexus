import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import ConfirmDeleteDialog from '@/components/key/ConfirmDeleteDialog';
import KeyPageShell from '@/components/key/KeyPageShell';
import KeyTypeFormDialog from '@/components/key/KeyTypeFormDialog';
import ProtocolTable from '@/components/key/ProtocolTable';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getKeyTypeDetails } from '@/lib/db/keyActions';
import { listProtocols } from '@/lib/db/keyProtocolActions';
import { formatKeyNr } from '@/lib/key/constants';
import requireKeyPageAccess from '@/lib/key/requireKeyPageAccess';
import { cn } from '@/lib/utils';

export default async function KeyTypePage({ params }: { params: Promise<{ id: string }> }): Promise<ReactElement> {
    await requireKeyPageAccess();
    const { id } = await params;
    const details = await getKeyTypeDetails(id);
    if (details === null) {
        notFound();
    }
    const protocols = await listProtocols({ keyTypeId: id });
    const { keyType, holders } = details;
    const title = `${formatKeyNr(keyType.keyNr)} – ${keyType.keyDescription}`;

    const stats = [
        { label: 'Bestand', value: keyType.totalQuantity ?? '?' },
        { label: 'Ausgegeben', value: keyType.issued },
        { label: 'Verfügbar', value: keyType.available ?? '?', warn: keyType.available !== null && keyType.available < 0 },
    ];

    return (
        <KeyPageShell
            breadcrumbs={[{ title: 'Schließungen', url: '/key/types' }, { title: formatKeyNr(keyType.keyNr) }]}
            title={title}
            actions={
                <>
                    <KeyTypeFormDialog keyType={keyType} />
                    <ConfirmDeleteDialog
                        url={`/api/key/types/${keyType.id}`}
                        title="Schließung löschen"
                        description={`Die Schließung ${formatKeyNr(keyType.keyNr)} wird aus der Liste entfernt. Protokolle bleiben erhalten.`}
                        successMessage="Die Schließung wurde gelöscht."
                        errorMessage="Die Schließung konnte nicht gelöscht werden."
                        redirectTo="/key/types"
                        disabled={keyType.issued > 0}
                        disabledReason="Es sind noch Schlüssel dieser Schließung ausgegeben."
                    />
                </>
            }
        >
            <div className="grid grid-cols-3 gap-4">
                {stats.map((stat) => (
                    <Card key={stat.label}>
                        <CardHeader className="pb-2">
                            <CardDescription>{stat.label}</CardDescription>
                            <CardTitle className={cn('text-3xl tabular-nums', stat.warn === true && 'text-destructive')}>
                                {stat.value}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                ))}
            </div>
            {keyType.available !== null && keyType.available < 0 && (
                <p className="text-sm text-destructive">
                    Es sind mehr Schlüssel ausgegeben als im Bestand stehen. Bitte den Bestand prüfen.
                </p>
            )}

            <div className="space-y-3">
                <h2 className="text-lg font-semibold">Wer hat diese Schlüssel?</h2>
                <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted text-muted-foreground">
                            <tr>
                                <th className="p-3">Nr.</th>
                                <th className="p-3">Name</th>
                                <th className="p-3 text-right">Anzahl</th>
                            </tr>
                        </thead>
                        <tbody>
                            {holders.map((holder) => (
                                <tr key={holder.userProfileId} className="border-t hover:bg-muted/50">
                                    <td className="p-3 text-muted-foreground tabular-nums">{holder.profileNumber ?? '–'}</td>
                                    <td className="p-3">
                                        <Link href={`/key/profiles/${holder.userProfileId}`} className="font-medium hover:underline">
                                            {holder.name}
                                        </Link>
                                        {holder.profileKind === 'safe' && (
                                            <Badge variant="secondary" className="ml-2">
                                                Tresor
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="p-3 text-right tabular-nums">{holder.quantity}</td>
                                </tr>
                            ))}
                            {holders.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-6 text-center text-muted-foreground">
                                        Keine Schlüssel dieser Schließung ausgegeben.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="space-y-3">
                <h2 className="text-lg font-semibold">Protokolle mit dieser Schließung</h2>
                <ProtocolTable protocols={protocols} />
            </div>
        </KeyPageShell>
    );
}
