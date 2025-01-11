'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
    mail: z.string().email(),
});

export default function FormChangeMail({ mail }: { mail: string }): ReactElement {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),

        defaultValues: {
            mail,
        },
    });

    const [isLoading, setIsLoading] = useState(false);

    if (mail === undefined) {
        return <div>Loading...</div>;
    }

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true);

        try {
            const response = await fetch('/api/account/change-mail', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    newEmail: values.mail,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                toast.error('Fehler beim Ändern der Mail-Adresse!', {
                    description: result.error || 'Unbekannter Fehler.',
                });
                return;
            }

            // Update the session.
            const signInResult = await signIn('keycloak', { redirect: false });
            if (signInResult?.error) {
                toast.error('Fehler beim Aktualisieren der Sitzung.', {
                    description: 'Bitte melde dich erneut an.',
                });
                return;
            }

            toast.success('Deine Mail-Adresse wurde geändert!', {
                description: `Ab sofort kannst du dich mit der Mail-Adresse @${values.mail} in allen unseren Diensten anmelden.`,
                duration: 10000,
            });
        } catch {
            toast.error('Fehler beim Ändern der Mail-Adresse!', {
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
                        <CardTitle>E-Mail-Adresse</CardTitle>
                        <CardDescription>Diese Mail-Adresse wird für den Login verwendet.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid gap-2">
                            <FormField
                                control={form.control}
                                name="mail"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dein Anzeigename</FormLabel>
                                        <FormControl>
                                            <Input placeholder={mail} {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Stelle sicher, dass du die richtige E-Mail-Adresse angibst. Wir verschicken keine
                                            Bestätigungsmail.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
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
