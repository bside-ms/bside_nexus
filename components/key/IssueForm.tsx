'use client';

import { useState } from 'react';
import { KeyRound, Loader2, Nfc, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import sendKeyRequest from '@/components/key/sendKeyRequest';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { KeyTypeListEntry } from '@/lib/db/keyActions';
import type { CreatedProtocol } from '@/lib/db/keyProtocolActions';
import { formatKeyNr, KEY_PROTOCOL_MAX_LINES } from '@/lib/key/constants';

interface KeyLine {
    id: number;
    lineType: 'key';
    keyTypeId: string;
    quantity: string;
}

interface TransponderLine {
    id: number;
    lineType: 'transponder';
    serial: string;
    description: string;
}

type Line = KeyLine | TransponderLine;

interface IssueFormProps {
    profileId: string;
    isSafe: boolean;
    keyTypes: Array<KeyTypeListEntry>;
}

const IssueForm = ({ profileId, isSafe, keyTypes }: IssueFormProps): ReactElement => {
    const router = useRouter();
    const [lines, setLines] = useState<Array<Line>>([{ id: 1, lineType: 'key', keyTypeId: '', quantity: '1' }]);
    const [nextId, setNextId] = useState(2);
    const [comment, setComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const addLine = (lineType: Line['lineType']): void => {
        setLines((current) => [
            ...current,
            lineType === 'key'
                ? { id: nextId, lineType, keyTypeId: '', quantity: '1' }
                : { id: nextId, lineType, serial: '', description: 'Transponder' },
        ]);
        setNextId((id) => id + 1);
    };

    const updateLine = (id: number, patch: Partial<KeyLine> | Partial<TransponderLine>): void => {
        setLines((current) => current.map((line) => (line.id === id ? ({ ...line, ...patch } as Line) : line)));
    };

    const removeLine = (id: number): void => {
        setLines((current) => current.filter((line) => line.id !== id));
    };

    const isLineComplete = (line: Line): boolean =>
        line.lineType === 'key' ? line.keyTypeId !== '' && /^[1-9]\d?$/.test(line.quantity) : line.serial.trim() !== '';
    const canSubmit = lines.length > 0 && lines.every(isLineComplete);
    const protocolCount = Math.ceil(lines.length / KEY_PROTOCOL_MAX_LINES);

    const onSubmit = async (): Promise<void> => {
        setIsLoading(true);
        const body = {
            protocolType: 'issuance',
            userProfileId: profileId,
            comment: comment.trim() === '' ? null : comment.trim(),
            lines: lines.map((line) =>
                line.lineType === 'key'
                    ? { lineType: 'key', keyTypeId: line.keyTypeId, quantity: Number(line.quantity) }
                    : { lineType: 'transponder', transponderSerial: line.serial, description: line.description },
            ),
        };
        const result = await sendKeyRequest<{ protocols: Array<CreatedProtocol> }>('POST', '/api/key/protocols', body, {
            error: 'Die Ausgabe konnte nicht gespeichert werden.',
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
                <CardTitle>Was wird ausgegeben?</CardTitle>
                <CardDescription>
                    Schlüssel werden pro Schließung gezählt. Transponder stehen nur auf der Quittung, verwaltet werden sie in wAppLoxx.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {lines.map((line) => {
                    if (line.lineType === 'key') {
                        const keyType = keyTypes.find((entry) => entry.id === line.keyTypeId);
                        const exceeds =
                            keyType?.available !== null && keyType !== undefined && Number(line.quantity) > (keyType.available ?? 0);
                        return (
                            <div key={line.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_6rem_auto] sm:items-end">
                                <div className="grid gap-1.5">
                                    <Label htmlFor={`line-${line.id}-type`} className="flex items-center gap-1.5">
                                        <KeyRound className="size-4" /> Schließung
                                    </Label>
                                    <Select value={line.keyTypeId} onValueChange={(value) => updateLine(line.id, { keyTypeId: value })}>
                                        <SelectTrigger id={`line-${line.id}-type`}>
                                            <SelectValue placeholder="Schließung wählen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {keyTypes.map((entry) => (
                                                <SelectItem key={entry.id} value={entry.id}>
                                                    {formatKeyNr(entry.keyNr)} – {entry.keyDescription}
                                                    {entry.available === null ? '' : ` (verfügbar: ${entry.available})`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor={`line-${line.id}-quantity`}>Anzahl</Label>
                                    <Input
                                        id={`line-${line.id}-quantity`}
                                        inputMode="numeric"
                                        value={line.quantity}
                                        onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                                    />
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => removeLine(line.id)} aria-label="Zeile entfernen">
                                    <Trash2 className="size-4" />
                                </Button>
                                {exceeds && (
                                    <p className="text-sm text-amber-600 sm:col-span-3 dark:text-amber-400">
                                        Laut Bestand sind nur {keyType.available} verfügbar. Stimmt der Bestand der Schließung noch?
                                    </p>
                                )}
                            </div>
                        );
                    }
                    return (
                        <div key={line.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
                            <div className="grid gap-1.5">
                                <Label htmlFor={`line-${line.id}-serial`} className="flex items-center gap-1.5">
                                    <Nfc className="size-4" /> Transponder-Nr.
                                </Label>
                                <Input
                                    id={`line-${line.id}-serial`}
                                    placeholder="z. B. KDE164399"
                                    value={line.serial}
                                    onChange={(event) => updateLine(line.id, { serial: event.target.value })}
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor={`line-${line.id}-description`}>Bezeichnung auf der Quittung</Label>
                                <Input
                                    id={`line-${line.id}-description`}
                                    placeholder="z. B. Transponder (grün)"
                                    value={line.description}
                                    onChange={(event) => updateLine(line.id, { description: event.target.value })}
                                />
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeLine(line.id)} aria-label="Zeile entfernen">
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    );
                })}

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => addLine('key')}>
                        <KeyRound className="mr-2 size-4" />
                        Schlüssel hinzufügen
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addLine('transponder')}>
                        <Nfc className="mr-2 size-4" />
                        Transponder hinzufügen
                    </Button>
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="issue-comment">Interne Notiz (optional)</Label>
                    <Textarea id="issue-comment" rows={2} value={comment} onChange={(event) => setComment(event.target.value)} />
                </div>

                {protocolCount > 1 && (
                    <p className="text-sm text-muted-foreground">
                        Eine Quittung hat Platz für {KEY_PROTOCOL_MAX_LINES} Zeilen. Es werden {protocolCount} Quittungen angelegt.
                    </p>
                )}
                {isSafe && (
                    <p className="text-sm text-muted-foreground">
                        Für Tresore wird keine Quittung zum Unterschreiben erzeugt, die Ausgabe steht nur in der Historie.
                    </p>
                )}

                <Button onClick={onSubmit} disabled={!canSubmit || isLoading}>
                    {isLoading ? <Loader2 className="size-4 animate-spin" /> : isSafe ? 'In den Tresor legen' : 'Ausgeben'}
                </Button>
            </CardContent>
        </Card>
    );
};

export default IssueForm;
