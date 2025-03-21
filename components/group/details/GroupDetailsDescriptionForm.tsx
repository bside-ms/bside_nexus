'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import type { ComponentProps, ReactElement } from 'react';
import { type ControllerRenderProps, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { GroupDetailsProps } from '@/components/group/details/GroupDetailsDescription';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const formSchema = z.object({
    description: z.string().max(510).optional(),
    websiteLink: z.string().max(255).optional(),
    wikiLink: z.string().max(255).optional(),
});

const renderField =
    (fieldName: keyof z.infer<typeof formSchema>, label: string, placeholder: string) =>
    ({ field }: { field: ControllerRenderProps<z.infer<typeof formSchema>, typeof fieldName> }): ReactElement => (
        <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
                <Input placeholder={placeholder} {...field} />
            </FormControl>
            <FormDescription />
            <FormMessage />
        </FormItem>
    );

export function GroupDescriptionForm({
    className,
    groupId,
    wikiLink,
    websiteLink,
    description,
}: ComponentProps<'form'> & Partial<GroupDetailsProps>): ReactElement {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),

        defaultValues: {
            description,
            websiteLink,
            wikiLink,
        },
    });

    const [isLoading, setIsLoading] = useState(false);

    if (description === undefined) {
        return <div>Loading...</div>;
    }

    const onSubmit = async (values: z.infer<typeof formSchema>): Promise<void> => {
        setIsLoading(true);

        try {
            const response = await fetch('/api/group/details', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    groupId,
                    description: values.description,
                    wikiLink: values.wikiLink,
                    websiteLink: values.websiteLink,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                toast.error('Fehler beim Ändern der Gruppendetails.', {
                    description: result.error ?? 'Unbekannter Fehler.',
                });
                return;
            }

            toast.success('Die Gruppe wurde erfolgreich aktualisiert.', {
                duration: 10000,
            });

            window.location.reload();
        } catch {
            toast.error('Fehler beim Ändern der Gruppendetails.', {
                description: 'Bitte versuche es später erneut.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Form {...form}>
            <form className={cn('grid items-start gap-4', className)} onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid gap-2">
                    <FormField control={form.control} name="description" render={renderField('description', 'Beschreibung', description)} />
                </div>
                <div className="grid gap-2">
                    <FormField
                        control={form.control}
                        name="websiteLink"
                        render={renderField('websiteLink', 'Link zur Webseite', 'Kein Link hinterlegt.')}
                    />
                </div>
                <div className="grid gap-2">
                    <FormField
                        control={form.control}
                        name="wikiLink"
                        render={renderField('wikiLink', 'Link zur Wiki', 'Kein Link hinterlegt.')}
                    />
                </div>
                <Button variant="secondary" type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                        <div className="flex items-center justify-center space-x-2">
                            <Loader2 className="size-4 animate-spin" /> {/* Spinner */}
                            <span>Lädt...</span>
                        </div>
                    ) : (
                        'Speichern'
                    )}
                </Button>
            </form>
        </Form>
    );
}
