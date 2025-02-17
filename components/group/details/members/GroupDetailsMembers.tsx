import { PlusCircle } from 'lucide-react';
import type { ReactElement } from 'react';
import type { GroupMember } from '@/components/group/details/members/GroupMembersColumns';
import { GroupMembersColumns } from '@/components/group/details/members/GroupMembersColumns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/datatable';

interface GroupMembersProps {
    groupMembers: Array<GroupMember>;
}

export function GroupDetailsMembers({ groupMembers }: GroupMembersProps): ReactElement {
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Mitglieder</CardTitle>
                    <Button size="sm" variant="outline" disabled={true}>
                        <PlusCircle className="mr-2 size-4" />
                        Mitglieder hinzufügen
                    </Button>
                </CardHeader>
                <CardContent>{groupMembers.length > 0 && <DataTable columns={GroupMembersColumns} data={groupMembers} />}</CardContent>
            </Card>
        </div>
    );
}
