'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Pencil, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import sendKeyRequest from '@/components/key/sendKeyRequest';
import UserCombobox from '@/components/key/UserCombobox';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { UserProfileEntry } from '@/db/schema';
import type { LinkableUser } from '@/lib/db/keyActions';
import { KEY_PROFILE_KINDS, toKeyProfileKind } from '@/lib/key/constants';
import { z } from '@/lib/zod';

const formSchema = z
    .object({
        profileKind: z.enum(KEY_PROFILE_KINDS),
        userId: z.string(),
        firstName: z.string().trim().min(1, 'Bitte gib einen Namen an.').max(255),
        lastName: z.string().trim().max(255),
        addressStreet: z.string().trim().max(255),
        addressHouseNumber: z.string().trim().max(50),
        addressZipCode: z.string().trim().max(20),
        addressCity: z.string().trim().max(255),
        phoneNumber: z.string().trim().max(50),
        emailAddress: z.string().trim().max(255),
        description: z.string().trim().max(2000),
    })
    .refine((value) => value.emailAddress === '' || z.email().safeParse(value.emailAddress).success, {
        message: 'Bitte gib eine gültige E-Mail-Adresse an.',
        path: ['emailAddress'],
    });

type FormValues = z.infer<typeof formSchema>;

const toFormValues = (profile: UserProfileEntry | undefined): FormValues => ({
    profileKind: profile === undefined ? 'person' : toKeyProfileKind(profile.profileKind),
    userId: profile?.userId ?? '',
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    addressStreet: profile?.addressStreet ?? '',
    addressHouseNumber: profile?.addressHouseNumber ?? '',
    addressZipCode: profile?.addressZipCode ?? '',
    addressCity: profile?.addressCity ?? '',
    phoneNumber: profile?.phoneNumber ?? '',
    emailAddress: profile?.emailAddress ?? '',
    description: profile?.description ?? '',
});

interface KeyProfileFormDialogProps {
    users: Array<LinkableUser>;
    // Without a profile the dialog creates a new one.
    profile?: UserProfileEntry;
}

const TEXT_FIELDS_PERSON: Array<{ name: keyof FormValues; label: string; className?: string; type?: string }> = [
    { name: 'addressStreet', label: 'Straße', className: 'sm:col-span-2' },
    { name: 'addressHouseNumber', label: 'Hausnummer' },
    { name: 'addressZipCode', label: 'PLZ' },
    { name: 'addressCity', label: 'Ort', className: 'sm:col-span-2' },
    { name: 'phoneNumber', label: 'Telefon', type: 'tel' },
    { name: 'emailAddress', label: 'E-Mail', className: 'sm:col-span-2', type: 'email' },
];

const KeyProfileFormDialog = ({ users, profile }: KeyProfileFormDialogProps): ReactElement => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const isEdit = profile !== undefined;

    const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: toFormValues(profile) });
    const kind = form.watch('profileKind');

    const onOpenChange = (next: boolean): void => {
        if (next) {
            form.reset(toFormValues(profile));
        }
        setOpen(next);
    };

    const onSubmit = async (values: FormValues): Promise<void> => {
        setIsLoading(true);
        const result = await sendKeyRequest<{ id: string }>(
            isEdit ? 'PATCH' : 'POST',
            isEdit ? `/api/key/profiles/${profile.id}` : '/api/key/profiles',
            values,
            {
                success: isEdit ? 'Das Profil wurde gespeichert.' : 'Das Profil wurde angelegt.',
                error: isEdit ? 'Das Profil konnte nicht gespeichert werden.' : 'Das Profil konnte nicht angelegt werden.',
            },
        );
        setIsLoading(false);
        if (result === null) {
            return;
        }
        setOpen(false);
        if (isEdit) {
            router.refresh();
        } else {
            router.push(`/key/profiles/${result.id}`);
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
                        Neues Profil
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Profil bearbeiten' : 'Neues Profil'}</DialogTitle>
                    <DialogDescription>
                        Profile gibt es für Personen (auch ohne Nexus-Account) und für Schlüsseltresore. Die Daten erscheinen auf neuen
                        Quittungen. Alte Quittungen behalten die Daten von damals.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
                        <FormField
                            control={form.control}
                            name="profileKind"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Art</FormLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="person">Person</SelectItem>
                                            <SelectItem value="safe">Schlüsseltresor</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {kind === 'safe' ? (
                            <>
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bezeichnung</FormLabel>
                                            <FormControl>
                                                <Input placeholder="z. B. Tresor Hintereingang" autoComplete="off" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Standort und Hinweise</FormLabel>
                                            <FormControl>
                                                <Textarea rows={3} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        ) : (
                            <>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Vorname</FormLabel>
                                                <FormControl>
                                                    <Input autoComplete="off" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="lastName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nachname</FormLabel>
                                                <FormControl>
                                                    <Input autoComplete="off" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="userId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nexus-Account (optional)</FormLabel>
                                            <UserCombobox users={users} value={field.value} onChange={field.onChange} />
                                            <FormDescription>Für Externe ohne Account leer lassen.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid gap-4 sm:grid-cols-3">
                                    {TEXT_FIELDS_PERSON.map((entry) => (
                                        <FormField
                                            key={entry.name}
                                            control={form.control}
                                            name={entry.name}
                                            render={({ field }) => (
                                                <FormItem className={entry.className}>
                                                    <FormLabel>{entry.label}</FormLabel>
                                                    <FormControl>
                                                        <Input type={entry.type ?? 'text'} autoComplete="off" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Notiz</FormLabel>
                                            <FormControl>
                                                <Textarea rows={2} placeholder="z. B. Mieter*in Raum 207" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="size-4 animate-spin" /> : isEdit ? 'Speichern' : 'Anlegen'}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default KeyProfileFormDialog;
