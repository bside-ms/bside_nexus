'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { LinkableUser } from '@/lib/db/keyActions';
import { cn } from '@/lib/utils';

interface UserComboboxProps {
    id?: string;
    users: Array<LinkableUser>;
    value: string;
    onChange: (userId: string) => void;
}

// Searchable select for the optional link to a Nexus account. Empty value = no account.
const UserCombobox = ({ id, users, value, onChange }: UserComboboxProps): ReactElement => {
    const [open, setOpen] = useState(false);
    const selected = users.find((user) => user.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                >
                    <span className={cn('truncate', selected === undefined && 'text-muted-foreground')}>
                        {selected?.label ?? 'Kein Account verknüpft'}
                    </span>
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Name oder Benutzername suchen…" />
                    <CommandList>
                        <CommandEmpty>Kein Account gefunden.</CommandEmpty>
                        <CommandGroup>
                            <CommandItem
                                value="__none__ kein account"
                                onSelect={() => {
                                    onChange('');
                                    setOpen(false);
                                }}
                            >
                                <Check className={cn('mr-2 size-4', value === '' ? 'opacity-100' : 'opacity-0')} />
                                Kein Account verknüpft
                            </CommandItem>
                            {users.map((user) => (
                                <CommandItem
                                    key={user.id}
                                    value={`${user.label} ${user.id}`}
                                    onSelect={() => {
                                        onChange(user.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn('mr-2 size-4', value === user.id ? 'opacity-100' : 'opacity-0')} />
                                    {user.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default UserCombobox;
