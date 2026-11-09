'use client';

import { useState } from 'react';
import { Ban, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import sendKeyRequest from '@/components/key/sendKeyRequest';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const CancelProtocolDialog = ({ protocolId, protocolNumber }: { protocolId: string; protocolNumber: string }): ReactElement => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const onConfirm = async (): Promise<void> => {
        setIsLoading(true);
        const result = await sendKeyRequest(
            'POST',
            `/api/key/protocols/${protocolId}/cancel`,
            { reason },
            { success: `Protokoll ${protocolNumber} wurde storniert.`, error: 'Das Protokoll konnte nicht storniert werden.' },
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
                    Stornieren
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Protokoll {protocolNumber} stornieren</DialogTitle>
                    <DialogDescription>
                        Nur für falsch angelegte Protokolle. Das Protokoll bleibt sichtbar, zählt aber nicht mehr für den Bestand. Die
                        Nummer wird nicht neu vergeben.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                    <Label htmlFor="cancel-reason">Grund</Label>
                    <Textarea id="cancel-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Abbrechen
                    </Button>
                    <Button variant="destructive" onClick={onConfirm} disabled={isLoading || reason.trim().length < 3}>
                        {isLoading ? <Loader2 className="size-4 animate-spin" /> : 'Stornieren'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CancelProtocolDialog;
