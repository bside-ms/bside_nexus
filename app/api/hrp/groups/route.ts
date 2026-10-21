import { NextResponse } from 'next/server';
import getUserSession from '@/lib/auth/getUserSession';
import { HRP_EMPLOYER_GROUP_IDS } from '@/lib/constants';
import { getGroupsWithMembers } from '@/lib/db/groupActions';

const TARGET_GROUP_IDS = Object.values(HRP_EMPLOYER_GROUP_IDS);

export async function GET(): Promise<NextResponse> {
    const session = await getUserSession();
    const isAllowedRole = session?.roles?.includes('arbeitszeiterfassung-admin') ?? false;
    if (!session || !isAllowedRole) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const groupsWithMembers = await getGroupsWithMembers(TARGET_GROUP_IDS);
        return NextResponse.json({ success: true, data: groupsWithMembers });
    } catch {
        return NextResponse.json({ success: false, message: 'Gruppen konnten nicht geladen werden' }, { status: 500 });
    }
}
