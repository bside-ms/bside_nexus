'use client';

import { zodResolver } from '@hookform/resolvers/zod';
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

    if (mail === undefined) {
        return <div>Loading...</div>;
    }

    function onSubmit(values: z.infer<typeof formSchema>) {
        // Do something with the form values.
        // ✅ This will be type-safe and validated.

        // eslint-disable-next-line no-console
        console.log(values);

        toast.success('Deine E-Mail-Adresse wurde geändert!', {
            description: `Bitte logge dich mit deiner neuen E-Mail-Adresse ein.`,
            duration: 10000,
        });
    }

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
                        <Button variant="secondary" type="submit" className="w-full">
                            Speichern
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
