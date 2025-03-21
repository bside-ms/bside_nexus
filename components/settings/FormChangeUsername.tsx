'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { isEmpty } from 'lodash-es';
import { Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import type { ReactElement } from 'react';
import { type ControllerRenderProps, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
    username: z.string().min(3).max(255),
});

const renderField =
    (fieldName: keyof z.infer<typeof formSchema>, label: string, placeholder: string, description: string) =>
    ({ field }: { field: ControllerRenderProps<z.infer<typeof formSchema>, typeof fieldName> }): ReactElement => (
        <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
                <Input placeholder={placeholder} {...field} />
            </FormControl>
            <FormDescription>{description}</FormDescription>
            <FormMessage />
        </FormItem>
    );

export default function FormChangeUsername({ username }: { username: string }): ReactElement {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),

        defaultValues: {
            username,
        },
    });

    const [isLoading, setIsLoading] = useState(false);

    if (username === undefined) {
        return <div>Loading...</div>;
    }

    const onSubmit = async (values: z.infer<typeof formSchema>): Promise<void> => {
        setIsLoading(true);

        try {
            const response = await fetch('/api/account/change-username', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    newUsername: values.username,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                toast.error('Fehler beim Ändern des Benutzer*innen-Namens.', {
                    description: result.error ?? 'Unbekannter Fehler.',
                });
                return;
            }

            // Update the session.
            const signInResult = await signIn('keycloak', { redirect: false });
            if (signInResult === undefined || isEmpty(signInResult.error)) {
                toast.error('Fehler beim Aktualisieren der Sitzung.', {
                    description: 'Bitte melde dich erneut an.',
                });
                return;
            }

            toast.success('Dein Username wurde geändert!', {
                description: `Bei Mattermost heißt du nun @${values.username}.`,
                duration: 10000,
            });
        } catch {
            toast.error('Fehler beim Ändern des Benutzernamens.', {
                description: 'Bitte versuche es später erneut.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card className="rounded-xl ">
                    <CardHeader>
                        <CardTitle>Benutzer*innen-Name</CardTitle>
                        <CardDescription>
                            Dieser Name wird als dein Benutzer*innen-Name verwendet.
                            <br />
                            Dieser Name muss eindeutig sein und darf keine Leerzeichen enthalten.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid gap-2">
                            <FormField
                                control={form.control}
                                name="username"
                                render={renderField('username', 'Dein Benutzer*innen-Name', username, 'Mindestens 3 Zeichen.')}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
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
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
