'use client';

import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { useBreakpointContext } from '@/components/common/BreakpointContext';
import type { GroupMember } from '@/components/group/details/members/GroupMembersColumns';
import { GroupMembersColumnsAdmin } from '@/components/group/details/members/GroupMembersColumns';
import { GroupMembersColumns } from '@/components/group/details/members/GroupMembersColumns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/datatable';
import type { GroupAdminStatus } from '@/lib/db/groupActions';

interface GroupMembersProps {
    groupMembers: Array<GroupMember>;
    isAdmin: GroupAdminStatus;
    isGlobalAdmin: boolean;
    groupId: string;
}

export function GroupDetailsMembers({ groupId, groupMembers, isAdmin, isGlobalAdmin }: GroupMembersProps): ReactElement {
    const { isLg } = useBreakpointContext();

    const isAdminOrGlobalAdmin = isAdmin === 'Admin' || isGlobalAdmin;

    return (
        <Card className="col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Mitglieder</CardTitle>
                {isAdminOrGlobalAdmin && (
                    <Link href={`/portal/groups/${groupId}/add`}>
                        <Button size="sm" variant="outline">
                            <PlusCircle className="mr-2 size-4" />
                            Mitglieder hinzufügen
                        </Button>
                    </Link>
                )}
            </CardHeader>
            {isAdminOrGlobalAdmin ? (
                <CardContent>
                    {groupMembers.length > 0 && isLg && <DataTable columns={GroupMembersColumnsAdmin} data={groupMembers} />}
                </CardContent>
            ) : (
                <CardContent>
                    {groupMembers.length > 0 && isLg && <DataTable columns={GroupMembersColumns} data={groupMembers} />}
                </CardContent>
            )}
        </Card>
    );
}
