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
    displayname: z.string().min(3).max(255),
});

export default function FormChangeDisplayname({ displayname }: { displayname: string }): ReactElement {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),

        defaultValues: {
            displayname,
        },
    });

    if (displayname === undefined) {
        return <div>Loading...</div>;
    }

    function onSubmit(values: z.infer<typeof formSchema>) {
        // Do something with the form values.
        // ✅ This will be type-safe and validated.

        // eslint-disable-next-line no-console
        console.log(values);

        toast.success('Dein Anzeigename wurde geändert!', {
            description: `Es kann ein paar Stunden dauern, bis dein Anzeigename in allen unseren Anwendungen angezeigt wird.`,
            duration: 10000,
        });
    }

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
                        <Button variant="secondary" type="submit" className="w-full">
                            Speichern
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
