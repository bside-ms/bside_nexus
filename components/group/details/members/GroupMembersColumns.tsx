'use client';

import { Fragment } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import axios from 'axios';
import { MoreHorizontal } from 'lucide-react';
import type { ReactElement } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/ui/datatable-columnheader';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface GroupMember {
    userId: string;
    groupId: string;
    displayName: string;
    username: string;
    email: string;
    status: 'invited' | 'member' | 'disabled' | 'admin';
}

async function removeMember(userId: string, groupId: string): Promise<void> {
    try {
        // Send POST request to remove the member
        const response = await axios.post('/api/group/remove', {
            userIdToBeRemoved: userId,
            groupId,
        });

        if (response.data.success) {
            toast.success('Benutzer*in wurde erfolgreich entfernt.');
        } else {
            toast.error(response.data.error || 'Fehler beim Entfernen der Benutzer*in.');
        }
    } catch {
        toast.error('Ein Fehler ist aufgetreten. Die Benutzer*in konnte nicht entfernt werden.');
    }
}

async function promoteMember(userId: string, groupId: string): Promise<void> {
    try {
        // Send POST request to remove the member
        const response = await axios.post('/api/group/promote', {
            userIdToBeRemoved: userId,
            groupId,
        });

        if (response.data.success) {
            toast.success('Benutzer*in wurde erfolgreich zur Administrator*innen ernannt.');
        } else {
            toast.error(response.data.error || 'Fehler beim Ernennen der Administrator*in.');
        }
    } catch {
        toast.error('Ein Fehler ist aufgetreten. Die Benutzer*in konnte nicht zur Administrator*innen ernannt werden.');
    }
}

async function demoteMember(userId: string, groupId: string): Promise<void> {
    try {
        // Send POST request to remove the member
        const response = await axios.post('/api/group/demote', {
            userIdToBeRemoved: userId,
            groupId,
        });

        if (response.data.success) {
            toast.success('Administrator*in wurde erfolgreich entfernt.');
        } else {
            toast.error(response.data.error || 'Fehler beim Entfernen der Administrator*in.');
        }
    } catch {
        toast.error('Ein Fehler ist aufgetreten. Die Administrator*in konnte nicht entfernt werden.');
    }
}

export const GroupMembersColumns: Array<ColumnDef<GroupMember>> = [
    {
        accessorKey: 'displayName',
        id: 'Anzeigename',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Anzeigename" />,
    },
    {
        accessorKey: 'username',
        id: 'Username',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Username" />,
        // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
        cell: ({ row }): ReactElement => {
            return <Fragment>@{row.getValue('Username')}</Fragment>;
        },
    },
    {
        accessorKey: 'email',
        id: 'E-Mail',
        header: ({ column }) => <DataTableColumnHeader column={column} title="E-Mail" />,
    },
    {
        accessorKey: 'status',
        id: 'Status',
        enableGlobalFilter: false,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    },
    {
        id: 'actions',
        header: 'Aktionen',
        enableGlobalFilter: false,
        // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
        cell: ({ row }): ReactElement => {
            const member = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="size-8 p-0">
                            <span className="sr-only">Menü öffenen</span>
                            <MoreHorizontal className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Aktionen: {member.displayName}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(member.username)}>
                            Kopiere den Mattermost-Handle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(member.email)}>
                            Kopiere die Mail-Adresse
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => removeMember(member.userId, member.groupId)}>
                            Aus der Gruppe entfernen
                        </DropdownMenuItem>
                        {member.status === 'admin' && (
                            <DropdownMenuItem onClick={() => demoteMember(member.userId, member.groupId)}>
                                Administrator*in entfernen
                            </DropdownMenuItem>
                        )}
                        {member.status === 'member' && (
                            <DropdownMenuItem onClick={() => promoteMember(member.userId, member.groupId)}>
                                Administrator*innen ernennen
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
