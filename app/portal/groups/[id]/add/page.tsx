import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';

interface AddMembersPageProps {
    params: Promise<{
        id: string;
    }>;
}

// Members are added in a panel on the group page now. Kept as a redirect for old links and bookmarks.
const AddMembersPage = async ({ params }: AddMembersPageProps): Promise<ReactElement> => {
    const { id: groupId } = await params;
    redirect(`/portal/groups/${groupId}`);
};

export default AddMembersPage;
