import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { getGroupsWithMembers } from '@/lib/db/groupActions';

const TARGET_GROUP_IDS = [
    'dc4fb9a9-7a32-4318-ba33-fdd6627ccea9',
    '1680099c-78e1-423c-bc70-92bec57e2f75',
    '0ff34819-fbe0-4119-87d4-f73666ed2464',
];

export async function GET() {
    const session = await getUserSession();
    const isAllowedRole = session?.roles?.includes('arbeitszeiterfassung-admin') ?? false;
    if (!session || !isAllowedRole) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const groupsWithMembers = await getGroupsWithMembers(TARGET_GROUP_IDS);
        return NextResponse.json({ success: true, data: groupsWithMembers });
    } catch (error) {
        console.error('Error fetching groups and members:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
