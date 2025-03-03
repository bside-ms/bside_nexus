'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { ComponentProps, ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { GroupDetailsProps } from '@/components/group/details/GroupDetailsDescription';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const formSchema = z.object({
    user: z.string({
        required_error: 'Wähle ein Mitglied aus.',
    }),
});

interface UserData {
    id: string;
    name: string;
    displayName: string;
}

export function GroupDetailsMembersForm({ groupId }: ComponentProps<'form'> & Partial<GroupDetailsProps>): ReactElement {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    const [isLoading, setIsLoading] = useState(false);
    const [users, setUsers] = useState<Array<UserData>>([]);

    const onSubmit = async (values: z.infer<typeof formSchema>): Promise<void> => {
        setIsLoading(true);

        try {
            const response = await fetch('/api/group/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    groupId,
                    userIdToBeAdded: values.user,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                toast.error('Fehler beim Hinzufügen der Mitglieder zur Gruppe.', {
                    description: result.error || 'Unbekannter Fehler.',
                });
                return;
            }

            toast.success('Die Mitglieder wurden erfolgreich hinzugefügt.', {
                duration: 10000,
            });

            setTimeout(() => (window.location.href = `/groups/${groupId!}`), 1000);
        } catch {
            toast.error('Fehler beim Hinzufügen der Mitglieder zur Gruppe.', {
                description: 'Bitte versuche es später erneut.',
            });
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('/api/group/userlist', {
                    method: 'POST',
                    headers: {
                        'Cache-Control': 'no-store',
                        'Content-Type': 'application/json',
                    },
                });
                const data = await response.json();
                setUsers(data);
            } catch {
                // Do nothing.
            }
        };

        fetchUsers();
    }, []);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {users.length === 0 ? (
                    <div className="mt-4 flex items-center justify-center space-x-2">
                        <Loader2 className="mr-4 size-4 animate-spin" /> {/* Spinner */}
                        Loading...
                    </div>
                ) : (
                    <FormField
                        control={form.control}
                        name="user"
                        render={({ field }) => (
                            <FormItem className="mt-4 flex flex-col">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn('justify-between', !field.value && 'text-muted-foreground')}
                                            >
                                                {field.value
                                                    ? // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                                                      `${users.find((user) => user.id === field.value)?.displayName} (@${users.find((user) => user.id === field.value)?.name})`
                                                    : 'Mitglied auswählen...'}
                                                <ChevronsUpDown className="opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0">
                                        <Command>
                                            <CommandInput placeholder="Mitglieder suchen..." className="h-9" />
                                            <CommandList>
                                                <CommandEmpty>Keine Mitglieder gefunden.</CommandEmpty>
                                                <CommandGroup>
                                                    {users.map((user) => (
                                                        <CommandItem
                                                            value={`${user.displayName} (@${user.name})`}
                                                            key={user.id}
                                                            onSelect={() => {
                                                                form.setValue('user', user.id);
                                                            }}
                                                        >
                                                            {user.displayName} (@{user.name})
                                                            <Check
                                                                className={cn(
                                                                    'ml-auto',
                                                                    user.id === field.value ? 'opacity-100' : 'opacity-0',
                                                                )}
                                                            />
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>Aktuell kann leider nur ein Mitglied zur Zeit hinzugefügt werden.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <div className="grid grid-cols-1 space-y-4">
                    <Button variant="secondary" type="submit" className="" disabled={isLoading || users.length === 0}>
                        {isLoading ? (
                            <div className="flex items-center justify-center space-x-2">
                                <Loader2 className="size-4 animate-spin" /> {/* Spinner */}
                                <span>Lädt...</span>
                            </div>
                        ) : (
                            'Speichern'
                        )}
                    </Button>

                    <Link href={`/groups/${groupId!}`}>
                        <Button variant="destructive" type="button" className="w-full">
                            Abbrechen
                        </Button>
                    </Link>
                </div>
            </form>
        </Form>
    );
}
