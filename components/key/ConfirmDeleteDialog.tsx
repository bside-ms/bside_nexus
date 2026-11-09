'use client';

import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import sendKeyRequest from '@/components/key/sendKeyRequest';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ConfirmDeleteDialogProps {
    url: string;
    title: string;
    description: string;
    successMessage: string;
    errorMessage: string;
    redirectTo: string;
    disabled?: boolean;
    disabledReason?: string;
}

const ConfirmDeleteDialog = ({
    url,
    title,
    description,
    successMessage,
    errorMessage,
    redirectTo,
    disabled = false,
    disabledReason,
}: ConfirmDeleteDialogProps): ReactElement => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const onConfirm = async (): Promise<void> => {
        setIsLoading(true);
        const result = await sendKeyRequest('DELETE', url, undefined, { success: successMessage, error: errorMessage });
        setIsLoading(false);
        if (result !== null) {
            setOpen(false);
            router.push(redirectTo);
            router.refresh();
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" disabled={disabled} title={disabled ? disabledReason : undefined}>
                    <Trash2 className="mr-2 size-4" />
                    Löschen
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Abbrechen
                    </Button>
                    <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
                        {isLoading ? <Loader2 className="size-4 animate-spin" /> : 'Löschen'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ConfirmDeleteDialog;
