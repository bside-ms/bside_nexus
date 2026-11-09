'use client';

import { useState } from 'react';
import { Ban, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import sendKeyRequest from '@/components/key/sendKeyRequest';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { KeyDeletionKind } from '@/lib/key/constants';
import { KEY_DELETION_KIND_LABELS } from '@/lib/key/constants';

const KIND_DESCRIPTIONS: Record<KeyDeletionKind, string> = {
    cancelled: 'Das Protokoll wurde falsch angelegt, z. B. falsche Person oder falsche Schlüssel.',
    destroyed: 'Die Papierquittung wurde vernichtet oder ist ungültig, z. B. nie unterschrieben oder Schlüssel nie abgeholt.',
};

// Marks a protocol as invalid. The scan in Nextcloud stays untouched.
const CancelProtocolDialog = ({ protocolId, protocolNumber }: { protocolId: string; protocolNumber: string }): ReactElement => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [kind, setKind] = useState<KeyDeletionKind>('cancelled');
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const onConfirm = async (): Promise<void> => {
        setIsLoading(true);
        const label = KEY_DELETION_KIND_LABELS[kind].toLowerCase();
        const result = await sendKeyRequest(
            'POST',
            `/api/key/protocols/${protocolId}/cancel`,
            { kind, reason },
            {
                success: `Protokoll ${protocolNumber} wurde als ${label} markiert.`,
                error: 'Das Protokoll konnte nicht als ungültig markiert werden.',
            },
        );
        setIsLoading(false);
        if (result !== null) {
            setOpen(false);
            router.refresh();
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Ban className="mr-2 size-4" />
                    Ungültig machen
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Protokoll {protocolNumber} als ungültig markieren</DialogTitle>
                    <DialogDescription>
                        Das Protokoll bleibt sichtbar, zählt aber nicht mehr für den Bestand. Die Nummer wird nicht neu vergeben. Ein
                        hochgeladener Scan bleibt unverändert.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                    <Label htmlFor="cancel-kind">Art</Label>
                    <Select value={kind} onValueChange={(value) => setKind(value === 'destroyed' ? 'destroyed' : 'cancelled')}>
                        <SelectTrigger id="cancel-kind">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="cancelled">{KEY_DELETION_KIND_LABELS.cancelled}</SelectItem>
                            <SelectItem value="destroyed">{KEY_DELETION_KIND_LABELS.destroyed}</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">{KIND_DESCRIPTIONS[kind]}</p>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="cancel-reason">Grund</Label>
                    <Textarea id="cancel-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Abbrechen
                    </Button>
                    <Button variant="destructive" onClick={onConfirm} disabled={isLoading || reason.trim().length < 3}>
                        {isLoading ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            `Als ${KEY_DELETION_KIND_LABELS[kind].toLowerCase()} markieren`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CancelProtocolDialog;
