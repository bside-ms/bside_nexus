'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Pencil, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import sendKeyRequest from '@/components/key/sendKeyRequest';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { KeysBaseEntry } from '@/db/schema';
import { z } from '@/lib/zod';

const formSchema = z.object({
    keyNr: z
        .string()
        .trim()
        .regex(/^\d{1,4}$/, 'Bitte gib eine Nummer zwischen 0 und 9999 an.'),
    keyDescription: z.string().trim().min(1, 'Bitte gib eine Bezeichnung an.').max(255),
    totalQuantity: z
        .string()
        .trim()
        .regex(/^\d{0,4}$/, 'Bitte gib eine ganze Zahl an oder lass das Feld leer.'),
});

type FormValues = z.infer<typeof formSchema>;

const toFormValues = (keyType: KeysBaseEntry | undefined): FormValues => ({
    keyNr: keyType === undefined ? '' : String(keyType.keyNr),
    keyDescription: keyType?.keyDescription ?? '',
    totalQuantity: keyType?.totalQuantity === null || keyType?.totalQuantity === undefined ? '' : String(keyType.totalQuantity),
});

// Without a key type the dialog creates a new one.
const KeyTypeFormDialog = ({ keyType }: { keyType?: KeysBaseEntry }): ReactElement => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const isEdit = keyType !== undefined;

    const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: toFormValues(keyType) });

    const onOpenChange = (next: boolean): void => {
        if (next) {
            form.reset(toFormValues(keyType));
        }
        setOpen(next);
    };

    const onSubmit = async (values: FormValues): Promise<void> => {
        setIsLoading(true);
        const body = {
            keyNr: Number(values.keyNr),
            keyDescription: values.keyDescription,
            totalQuantity: values.totalQuantity === '' ? null : Number(values.totalQuantity),
        };
        const result = await sendKeyRequest<{ id: string }>(
            isEdit ? 'PATCH' : 'POST',
            isEdit ? `/api/key/types/${keyType.id}` : '/api/key/types',
            body,
            {
                success: isEdit ? 'Die Schließung wurde gespeichert.' : 'Die Schließung wurde angelegt.',
                error: isEdit ? 'Die Schließung konnte nicht gespeichert werden.' : 'Die Schließung konnte nicht angelegt werden.',
            },
        );
        setIsLoading(false);
        if (result !== null) {
            setOpen(false);
            router.refresh();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                {isEdit ? (
                    <Button variant="outline">
                        <Pencil className="mr-2 size-4" />
                        Bearbeiten
                    </Button>
                ) : (
                    <Button>
                        <PlusCircle className="mr-2 size-4" />
                        Neue Schließung
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Schließung bearbeiten' : 'Neue Schließung'}</DialogTitle>
                    <DialogDescription>
                        Eine Schließung ist eine Schlüsselart, z. B. 86 „B-Side Gesamt“. Schlüssel werden pro Schließung gezählt.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
                        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
                            <FormField
                                control={form.control}
                                name="keyNr"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nummer</FormLabel>
                                        <FormControl>
                                            <Input inputMode="numeric" autoComplete="off" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="keyDescription"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bezeichnung</FormLabel>
                                        <FormControl>
                                            <Input placeholder="z. B. Veranstaltungstechnik" autoComplete="off" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="totalQuantity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bestand</FormLabel>
                                    <FormControl>
                                        <Input inputMode="numeric" autoComplete="off" className="max-w-32" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Alle Schlüssel dieser Schließung, ausgegebene eingeschlossen. Leer lassen, wenn unbekannt.
                                        Verlustmeldungen ziehen verlorene Schlüssel automatisch ab.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="size-4 animate-spin" /> : isEdit ? 'Speichern' : 'Anlegen'}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default KeyTypeFormDialog;
