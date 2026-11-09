import { NextResponse } from 'next/server';
import requireRole from '@/lib/auth/requireRole';
import { writeLogEntry } from '@/lib/db/logActions';
import { KEY_ROLE } from '@/lib/key/constants';
import { KeyActionError } from '@/lib/key/errors';
import { getClientIP } from '@/lib/utils/getClientIP';
import type { ZodErrorShape } from '@/lib/validation/keySchemas';

export interface KeyGuard {
    userId: string;
    displayName: string | null;
}

// Returns the guard or a 403 response. The middleware does not cover /api.
export const guardKeyRoute = async (): Promise<KeyGuard | NextResponse> => {
    const guard = await requireRole(KEY_ROLE);
    if (!guard.isAllowed || guard.userId === null) {
        return NextResponse.json({ success: false, error: 'Dir fehlt die Berechtigung für die Schlüsselverwaltung.' }, { status: 403 });
    }
    return { userId: guard.userId, displayName: guard.displayName };
};

export const readJson = async (req: Request): Promise<unknown> => {
    try {
        return await req.json();
    } catch {
        return null;
    }
};

export const validationErrorResponse = (error: ZodErrorShape): NextResponse =>
    NextResponse.json(
        { success: false, error: error.issues?.[0]?.message ?? 'Ungültige Eingaben.', issues: error.issues },
        { status: 400 },
    );

// Expected errors keep their message, all others get a generic one.
export const errorResponse = (error: unknown, fallback: string): NextResponse => {
    if (error instanceof KeyActionError) {
        return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, error: fallback }, { status: 500 });
};

export const writeKeyLog = async (
    req: Request,
    guard: KeyGuard,
    eventType: string,
    description: string,
    affectedUserId: string | null = null,
): Promise<void> => {
    await writeLogEntry({
        userId: guard.userId,
        ipAddress: getClientIP(req),
        eventType,
        affectedUserId,
        affectedGroupId: null,
        description,
    });
};
