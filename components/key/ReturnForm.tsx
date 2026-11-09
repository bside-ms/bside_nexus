'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import sendKeyRequest from '@/components/key/sendKeyRequest';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CreatedProtocol, ProfileHoldings } from '@/lib/db/keyProtocolActions';
import { formatKeyNr, KEY_PROTOCOL_MAX_LINES } from '@/lib/key/constants';

interface ReturnFormProps {
    profileId: string;
    mode: 'return' | 'lost';
    holdings: ProfileHoldings;
}

// Return or loss of the keys and transponders a profile holds according to the protocols.
const ReturnForm = ({ profileId, mode, holdings }: ReturnFormProps): ReactElement => {
    const router = useRouter();
    const [quantities, setQuantities] = useState<Record<string, string>>({});
    const [serials, setSerials] = useState<Set<string>>(new Set());
    const [comment, setComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const isLost = mode === 'lost';

    const keyLines = holdings.keys
        .map((holding) => ({ holding, quantity: Number(quantities[holding.keyTypeId] ?? '0') }))
        .filter((entry) => entry.quantity > 0);
    const invalid = holdings.keys.some((holding) => {
        const raw = quantities[holding.keyTypeId] ?? '0';
        return !/^\d+$/.test(raw) || Number(raw) > holding.quantity;
    });
    const lineCount = keyLines.length + serials.size;

    const toggleSerial = (serial: string, checked: boolean): void => {
        setSerials((current) => {
            const next = new Set(current);
            if (checked) {
                next.add(serial);
            } else {
                next.delete(serial);
            }
            return next;
        });
    };

    const onSubmit = async (): Promise<void> => {
        setIsLoading(true);
        const body = {
            protocolType: mode,
            userProfileId: profileId,
            comment: comment.trim() === '' ? null : comment.trim(),
            lines: [
                ...keyLines.map((entry) => ({ lineType: 'key', keyTypeId: entry.holding.keyTypeId, quantity: entry.quantity })),
                ...[...serials].map((serial) => ({ lineType: 'transponder', transponderSerial: serial })),
            ],
        };
        const result = await sendKeyRequest<{ protocols: Array<CreatedProtocol> }>('POST', '/api/key/protocols', body, {
            error: isLost ? 'Der Verlust konnte nicht gespeichert werden.' : 'Die Rückgabe konnte nicht gespeichert werden.',
        });
        setIsLoading(false);
        if (result === null) {
            return;
        }
        const first = result.protocols[0];
        if (result.protocols.length === 1 && first !== undefined) {
            router.push(`/key/protocols/${first.id}?created=1`);
        } else {
            router.push(`/key/profiles/${profileId}?created=${result.protocols.map((protocol) => protocol.protocolNumber).join(',')}`);
        }
        router.refresh();
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{isLost ? 'Was ist verloren gegangen?' : 'Was wird zurückgegeben?'}</CardTitle>
                <CardDescription>
                    {isLost
                        ? 'Verlorene Schlüssel werden vom Bestand der Schließung abgezogen. Für Verlustmeldungen gibt es keine Quittung.'
                        : 'Die Rückgabe wird automatisch der ältesten offenen Ausgabe zugeordnet. Die Quittung nennt die Nummer der Ausgabe.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {holdings.keys.length > 0 && (
                    <div className="overflow-hidden rounded-lg border">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted text-muted-foreground">
                                <tr>
                                    <th className="p-3">Schließung</th>
                                    <th className="p-3 text-right">Ausgegeben</th>
                                    <th className="p-3 text-right">{isLost ? 'Verloren' : 'Zurück'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {holdings.keys.map((holding) => (
                                    <tr key={holding.keyTypeId} className="border-t">
                                        <td className="p-3">
                                            <span className="font-medium tabular-nums">{formatKeyNr(holding.keyNr)}</span>{' '}
                                            {holding.keyDescription}
                                        </td>
                                        <td className="p-3 text-right tabular-nums">{holding.quantity}</td>
                                        <td className="p-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <Input
                                                    aria-label={`Anzahl für Schließung ${formatKeyNr(holding.keyNr)}`}
                                                    inputMode="numeric"
                                                    className="w-20 text-right"
                                                    value={quantities[holding.keyTypeId] ?? '0'}
                                                    onChange={(event) =>
                                                        setQuantities((current) => ({
                                                            ...current,
                                                            [holding.keyTypeId]: event.target.value,
                                                        }))
                                                    }
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() =>
                                                        setQuantities((current) => ({
                                                            ...current,
                                                            [holding.keyTypeId]: String(holding.quantity),
                                                        }))
                                                    }
                                                >
                                                    alle
                                                </Button>
                                            </div>
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
                        {holdings.transponders.map((transponder) => (
                            <div key={transponder.serial} className="flex items-center gap-2">
                                <Checkbox
                                    id={`transponder-${transponder.serial}`}
                                    checked={serials.has(transponder.serial)}
                                    onCheckedChange={(checked) => toggleSerial(transponder.serial, checked === true)}
                                />
                                <Label htmlFor={`transponder-${transponder.serial}`} className="font-normal">
                                    <span className="font-medium">{transponder.serial}</span> {transponder.description}
                                </Label>
                            </div>
                        ))}
                        <p className="text-sm text-muted-foreground">Denk daran, den Transponder auch in wAppLoxx zu entfernen.</p>
                    </div>
                )}

                <div className="grid gap-1.5">
                    <Label htmlFor="return-comment">Interne Notiz (optional)</Label>
                    <Textarea id="return-comment" rows={2} value={comment} onChange={(event) => setComment(event.target.value)} />
                </div>

                {lineCount > KEY_PROTOCOL_MAX_LINES && (
                    <p className="text-sm text-muted-foreground">
                        Eine Quittung hat Platz für {KEY_PROTOCOL_MAX_LINES} Zeilen. Es werden mehrere Quittungen angelegt.
                    </p>
                )}
                {invalid && <p className="text-sm text-destructive">Die Anzahl darf nicht größer sein als die ausgegebene Menge.</p>}

                <Button variant={isLost ? 'destructive' : 'default'} onClick={onSubmit} disabled={lineCount === 0 || invalid || isLoading}>
                    {isLoading ? <Loader2 className="size-4 animate-spin" /> : isLost ? 'Verlust melden' : 'Rückgabe speichern'}
                </Button>
            </CardContent>
        </Card>
    );
};

export default ReturnForm;
