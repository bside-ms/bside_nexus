'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import sendKeyRequest from '@/components/key/sendKeyRequest';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Removes the "uncertain" mark of a protocol after it was checked.
const VerifyProtocolDialog = ({ protocolId, protocolNumber }: { protocolId: string; protocolNumber: string }): ReactElement => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const onConfirm = async (): Promise<void> => {
        setIsLoading(true);
        const result = await sendKeyRequest('POST', `/api/key/protocols/${protocolId}/verify`, undefined, {
            success: `Protokoll ${protocolNumber} ist als geprüft markiert.`,
            error: 'Das Protokoll konnte nicht als geprüft markiert werden.',
        });
        setIsLoading(false);
        if (result !== null) {
            setOpen(false);
            router.refresh();
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <CheckCircle2 className="mr-2 size-4" />
                    Als geprüft markieren
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>Protokoll {protocolNumber} als geprüft markieren</DialogTitle>
                    <DialogDescription>
                        Damit bestätigst du, dass der Vorgang so stattgefunden hat. Stimmt er nicht, markiere das Protokoll stattdessen als
                        storniert oder vernichtet.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Abbrechen
                    </Button>
                    <Button onClick={onConfirm} disabled={isLoading}>
                        {isLoading ? <Loader2 className="size-4 animate-spin" /> : 'Als geprüft markieren'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default VerifyProtocolDialog;
