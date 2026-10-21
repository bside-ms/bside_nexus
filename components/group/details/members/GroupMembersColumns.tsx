'use client';

/* eslint-disable react/jsx-no-bind */

import { Fragment } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronRight, Copy } from 'lucide-react';
import type { MouseEvent, ReactElement } from 'react';
import { copyToClipboard, hasMemberEmail } from '@/components/group/details/members/GroupMemberActions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/ui/datatable-columnheader';
import { cn } from '@/lib/utils';

export interface GroupMember {
    userId: string;
    groupId: string;
    displayName: string;
    username: string;
    email: string;
    status: 'invited' | 'member' | 'disabled' | 'admin';
}

export const formatMemberStatus = (status: string): string => {
    switch (status) {
        case 'admin':
            return 'Administrator*in';
        case 'member':
            return 'Mitglied';
        case 'disabled':
            return 'Deaktiviert';
        default:
            return 'Unbekannt';
    }
};

export const getMemberStatusBadgeVariant = (status: GroupMember['status']): BadgeProps['variant'] => {
    switch (status) {
        case 'admin':
            return 'default';
        case 'member':
            return 'secondary';
        default:
            return 'outline';
    }
};

interface GroupMemberAvatarProps {
    username: string;
    className?: string;
}

export function GroupMemberAvatar({ username, className }: GroupMemberAvatarProps): ReactElement {
    return (
        <Avatar className={cn('size-8 rounded-lg', className)}>
            <AvatarImage src={`/api/mattermost/${username}`} alt={`Avatar von ${username}`} />
            <AvatarFallback className="rounded-lg">{username.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
    );
}

interface CopyableCellProps {
    value: string;
    copyLabel: string;
    successMessage: string;
    prefix?: string;
}

// Copy button for table cells. With a mouse it only shows on row hover, on touch devices it is always visible.
function CopyableCell({ value, copyLabel, successMessage, prefix = '' }: CopyableCellProps): ReactElement {
    const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
        // The row click opens the member panel.
        event.stopPropagation();
        void copyToClipboard(value, successMessage);
    };

    return (
        <div className="flex items-center gap-1">
            <span>
                {prefix}
                {value}
            </span>
            <Button
                variant="ghost"
                size="icon"
                title={copyLabel}
                className="size-7 text-zinc-500 focus-visible:opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover/row:opacity-100 dark:text-zinc-400"
                onClick={handleClick}
            >
                <Copy className="size-3.5" />
                <span className="sr-only">{copyLabel}</span>
            </Button>
        </div>
    );
}

export const getGroupMembersColumns = (showEmail: boolean, onOpenMember: (member: GroupMember) => void): Array<ColumnDef<GroupMember>> => [
    {
        accessorKey: 'avatar',
        header: ({ column }) => <DataTableColumnHeader column={column} title="" />,
        enableGlobalFilter: false,
        enableSorting: false,
        cell: ({ row }): ReactElement => {
            const username: string = row.getValue('Username') ?? '';
            return (
                <div className="flex justify-end">
                    <GroupMemberAvatar username={username} />
                </div>
            );
        },
    },
    {
        accessorKey: 'displayName',
        id: 'Anzeigename',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Anzeigename" />,
    },
    {
        accessorKey: 'username',
        id: 'Username',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Username" />,
        cell: ({ row }): ReactElement => (
            <CopyableCell
                value={row.original.username}
                prefix="@"
                copyLabel="Mattermost-Namen kopieren"
                successMessage="Mattermost-Name wurde kopiert."
            />
        ),
    },
    ...(showEmail
        ? [
              {
                  accessorKey: 'email',
                  id: 'E-Mail',
                  header: ({ column }) => <DataTableColumnHeader column={column} title="E-Mail" />,
                  cell: ({ row }): ReactElement =>
                      hasMemberEmail(row.original) ? (
                          <CopyableCell
                              value={row.original.email}
                              copyLabel="Mail-Adresse kopieren"
                              successMessage="Mail-Adresse wurde kopiert."
                          />
                      ) : (
                          <Fragment>-</Fragment>
                      ),
              } satisfies ColumnDef<GroupMember>,
          ]
        : []),
    {
        accessorKey: 'status',
        id: 'Status',
        enableGlobalFilter: false,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }): ReactElement => {
            return <Fragment>{formatMemberStatus(row.getValue('Status'))}</Fragment>;
        },
    },
    {
        id: 'actions',
        header: () => <span className="sr-only">Details</span>,
        enableGlobalFilter: false,
        cell: ({ row }): ReactElement => (
            <div className="flex justify-end">
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={(event) => {
                        // The row click would open the panel a second time.
                        event.stopPropagation();
                        onOpenMember(row.original);
                    }}
                >
                    <ChevronRight className="size-4" />
                    <span className="sr-only">Details zu {row.original.displayName} öffnen</span>
                </Button>
            </div>
        ),
    },
];
