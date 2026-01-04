import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { hrpContractsTable, membersTable } from '@/db/schema';
import getUserSession from '@/lib/auth/getUserSession';
import { getActiveContractsForUser } from '@/lib/db/contractActions';
import { isGlobalAdmin } from '@/lib/db/groupActions';
import { v4 as uuidv4 } from 'uuid';

// Helper: Darf der User für diese Gruppe einen Vertrag erstellen?
async function isGroupAdmin(userId: string, groupId: string): Promise<boolean> {
    const member = await db.query.membersTable.findFirst({
        where: and(eq(membersTable.userId, userId), eq(membersTable.groupId, groupId), eq(membersTable.isAdmin, true)),
    });
    return !!member;
}

export async function GET(): Promise<NextResponse> {
    const session = await getUserSession();

    if (!session) {
        return NextResponse.json(
            {
                success: false,
                message: 'Für diese Aktion musst du eingeloggt sein.',
            },
            { status: 401 },
        );
    }

    const isAllowedRole = session?.roles?.includes('arbeitszeiterfassung') ?? false;
    if (!isAllowedRole) {
        return NextResponse.json(
            {
                success: false,
                message: 'Dir fehlen die notwendigen Berechtigungen.',
            },
            { status: 403 },
        );
    }

    const contracts = await getActiveContractsForUser(session.id);
    return NextResponse.json({ success: true, contracts }, { status: 200 });
}

export async function POST(req: Request): Promise<NextResponse> {
    const session = await getUserSession();
    const isAllowedRole = session?.roles?.includes('arbeitszeiterfassung-admin') ?? false;
    if (!session || !isAllowedRole) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Validierung: Darf der Admin das?
    const isAllowed = (await isGroupAdmin(session.id, body.employerGroupId)) || isGlobalAdmin(session.id);
    if (!isAllowed) {
        return NextResponse.json({ message: 'Du bist kein Admin dieser Gruppe.' }, { status: 403 });
    }

    // Vertrag erstellen
    await db.insert(hrpContractsTable).values({
        id: uuidv4(),
        userId: body.userId,
        employerGroupId: body.employerGroupId,
        type: body.type, // 'fixed_salary' | 'hourly'
        weeklyHours: body.weeklyHours || 0,
        vacationDaysPerYear: body.vacationDaysPerYear || 0,
        workingDays: body.workingDays || [1, 2, 3, 4, 5], // Default Mo-Fr
        validFrom: new Date(body.validFrom),
        validTo: body.validTo ? new Date(body.validTo) : null,
    });

    return NextResponse.json({ success: true });
}
