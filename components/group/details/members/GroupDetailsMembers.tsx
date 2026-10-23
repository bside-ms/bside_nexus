'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Row } from '@tanstack/react-table';
import { PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import type { GroupMemberActionContext } from '@/components/group/details/members/GroupMemberActions';
import { GroupMemberAddPanel } from '@/components/group/details/members/GroupMemberAddPanel';
import { GroupMemberMobileRow } from '@/components/group/details/members/GroupMemberMobileRow';
import type { GroupMemberPanelSelection, GroupMemberPanelVariant } from '@/components/group/details/members/GroupMemberPanel';
import { GroupMemberPanel } from '@/components/group/details/members/GroupMemberPanel';
import type { GroupMember } from '@/components/group/details/members/GroupMembersColumns';
import { getGroupMembersColumns } from '@/components/group/details/members/GroupMembersColumns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/datatable';

interface GroupMembersProps {
    groupMembers: Array<GroupMember>;
    canManage: boolean;
    // False if the admins of the parent group manage it too.
    requiresAdmin: boolean;
    isSystemAdmin: boolean;
    currentUserId: string;
    groupId: string;
}

export function GroupDetailsMembers({
    groupId,
    groupMembers,
    canManage,
    requiresAdmin,
    isSystemAdmin,
    currentUserId,
}: GroupMembersProps): ReactElement {
    const router = useRouter();

    // Re-render the server page after a member change, so the table gets the new member list.
    const onMembersChanged = useCallback(() => router.refresh(), [router]);

    // Admins first, then alphabetically.
    const sortedMembers = useMemo(
        () =>
            [...groupMembers].sort(
                (a, b) =>
                    Number(b.status === 'admin') - Number(a.status === 'admin') ||
                    a.displayName.localeCompare(b.displayName, 'de', { sensitivity: 'base' }),
            ),
        [groupMembers],
    );

    const actionContext = useMemo((): GroupMemberActionContext | undefined => {
        if (!canManage) {
            return undefined;
        }
        const adminCount = groupMembers.filter((member) => member.status === 'admin').length;
        return { onMembersChanged, currentUserId, isSystemAdmin, adminCount, requiresAdmin };
    }, [canManage, groupMembers, onMembersChanged, currentUserId, isSystemAdmin, requiresAdmin]);

    // One panel for all members. The selection is kept after closing, so the panel does not go blank while it animates out.
    const [panelSelection, setPanelSelection] = useState<GroupMemberPanelSelection | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    const openPanel = useCallback((member: GroupMember, variant: GroupMemberPanelVariant): void => {
        setPanelSelection({ member, variant });
        setIsPanelOpen(true);
    }, []);

    const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
    const openAddPanel = useCallback((): void => setIsAddPanelOpen(true), []);

    const columns = useMemo(() => getGroupMembersColumns(canManage, (member) => openPanel(member, 'sheet')), [canManage, openPanel]);

    const handleRowClick = useCallback((row: Row<GroupMember>): void => openPanel(row.original, 'sheet'), [openPanel]);

    const handleOpenMobile = useCallback((member: GroupMember): void => openPanel(member, 'drawer'), [openPanel]);

    const renderMobileRow = useCallback(
        (row: Row<GroupMember>): ReactElement => <GroupMemberMobileRow member={row.original} onOpen={handleOpenMobile} />,
        [handleOpenMobile],
    );

    return (
        <Card className="col-span-2">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle>Mitglieder</CardTitle>
                {canManage && (
                    <Button size="sm" variant="outline" onClick={openAddPanel}>
                        <PlusCircle className="mr-2 size-4" />
                        Mitglieder hinzufügen
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {groupMembers.length > 0 && (
                    <DataTable columns={columns} data={sortedMembers} renderMobileRow={renderMobileRow} onRowClick={handleRowClick} />
                )}
                <GroupMemberPanel
                    selection={panelSelection}
                    isOpen={isPanelOpen}
                    onOpenChange={setIsPanelOpen}
                    actionContext={actionContext}
                />
                {canManage && (
                    <GroupMemberAddPanel
                        groupId={groupId}
                        isOpen={isAddPanelOpen}
                        onOpenChange={setIsAddPanelOpen}
                        onMembersAdded={onMembersChanged}
                    />
                )}
            </CardContent>
        </Card>
    );
}
