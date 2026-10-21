'use client';

/* eslint-disable react/jsx-no-bind */

import { ChevronRight } from 'lucide-react';
import type { ReactElement } from 'react';
import type { GroupMember } from '@/components/group/details/members/GroupMembersColumns';
import { formatMemberStatus, getMemberStatusBadgeVariant, GroupMemberAvatar } from '@/components/group/details/members/GroupMembersColumns';
import { Badge } from '@/components/ui/badge';

interface GroupMemberMobileRowProps {
    member: GroupMember;
    onOpen: (member: GroupMember) => void;
}

export function GroupMemberMobileRow({ member, onOpen }: GroupMemberMobileRowProps): ReactElement {
    return (
        <button type="button" className="flex w-full items-center gap-3 py-3 text-left" onClick={() => onOpen(member)}>
            <GroupMemberAvatar username={member.username} className="size-10" />
            <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{member.displayName}</p>
                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">@{member.username}</p>
            </div>
            <Badge variant={getMemberStatusBadgeVariant(member.status)} className="shrink-0">
                {formatMemberStatus(member.status)}
            </Badge>
            <ChevronRight className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
        </button>
    );
}
