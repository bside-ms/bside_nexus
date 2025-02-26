'use client';

import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import type { GroupMember } from '@/components/group/details/members/GroupMembersColumns';
import { GroupMembersColumns } from '@/components/group/details/members/GroupMembersColumns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/datatable';
import type { GroupAdminStatus } from '@/lib/db/groupActions';

interface GroupMembersProps {
    groupMembers: Array<GroupMember>;
    isAdmin: GroupAdminStatus;
    groupId: string;
}

export function GroupDetailsMembers({ groupId, groupMembers, isAdmin }: GroupMembersProps): ReactElement {
    return (
        <Card className="col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Mitglieder</CardTitle>
                {isAdmin === 'Admin' && (
                    <Link href={`/groups/${groupId}/add`}>
                        <Button size="sm" variant="outline">
                            <PlusCircle className="mr-2 size-4" />
                            Mitglieder hinzufügen
                        </Button>
                    </Link>
                )}
            </CardHeader>
            <CardContent>{groupMembers.length > 0 && <DataTable columns={GroupMembersColumns} data={groupMembers} />}</CardContent>
        </Card>
    );
}
