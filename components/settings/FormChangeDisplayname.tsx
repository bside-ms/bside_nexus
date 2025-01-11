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
    displayname: z.string().min(3).max(255),
});

export default function FormChangeDisplayname({ displayname }: { displayname: string }): ReactElement {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),

        defaultValues: {
            displayname,
        },
    });

    const [isLoading, setIsLoading] = useState(false);

    if (displayname === undefined) {
        return <div>Loading...</div>;
    }

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true);

        try {
            const response = await fetch('/api/account/change-displayname', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    newDisplayname: values.displayname,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                toast.error('Fehler beim Ändern des Anzeigenamens.', {
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

            toast.success('Dein Anzeigename wurde geändert!', {
                duration: 10000,
            });
        } catch {
            toast.error('Fehler beim Ändern deines Anzeigenamens.', {
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
                        <CardTitle>Anzeigename</CardTitle>
                        <CardDescription>Dieser Name wird in allen unseren Anwendungen als dein Anzeigename verwendet.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid gap-2">
                            <FormField
                                control={form.control}
                                name="displayname"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dein Anzeigename</FormLabel>
                                        <FormControl>
                                            <Input placeholder={displayname} {...field} />
                                        </FormControl>
                                        <FormDescription>Mindestens 3 Zeichen.</FormDescription>
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
