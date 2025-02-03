'use client';

import { Fragment } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import type { ReactElement } from 'react';
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
    displayName: string;
    username: string;
    email: string;
    status: 'invited' | 'member' | 'disabled' | 'admin';
}

export const GroupMembersColumns: Array<ColumnDef<GroupMember>> = [
    {
        accessorKey: 'displayName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Anzeigename" />,
    },
    {
        accessorKey: 'username',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Username" />,
        // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
        cell: ({ row }): ReactElement => {
            return <Fragment>@{row.getValue('username')}</Fragment>;
        },
    },
    {
        accessorKey: 'email',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    },
    {
        accessorKey: 'status',
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
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(member.email)}>
                            Kopiere die Mail-Adresse
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Benutzer*in aus der Gruppe entfernen</DropdownMenuItem>
                        <DropdownMenuItem>Benutzer*in zum Admin machen</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
