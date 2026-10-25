import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import getUserSession from '@/lib/auth/getUserSession';
import { isGlobalAdmin } from '@/lib/db/groupActions';
import { getClientIP } from '@/lib/utils/getClientIP';
import isNotEmptyString from '@/lib/utils/isNotEmptyString';

// Returns the user id of the system admin, or the error response.
export const requireSystemAdmin = async (): Promise<string | NextResponse> => {
    const user = await getUserSession();

    if (user === null || !isNotEmptyString(user.id)) {
        return NextResponse.json({ error: 'Du bist nicht eingeloggt.' }, { status: 401 });
    }

    if (!isGlobalAdmin(user.id)) {
        return NextResponse.json({ error: 'Nur System-Admins dürfen diese Aktion durchführen.' }, { status: 403 });
    }

    return user.id;
};

/**
 * Guard, validation, and the generic 500 error for the POST routes of system admins.
 *
 * @param req
 * @param schema
 * @param tag shown in the server log
 * @param errorMessage shown to the user if the action throws
 * @param action
 */
export const handleSystemAdminPost = async <T>(
    req: NextRequest,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    tag: string,
    errorMessage: string,
    action: (data: T, executingUserId: string, ipAddress: string) => Promise<NextResponse>,
): Promise<NextResponse> => {
    try {
        const executingUserId = await requireSystemAdmin();
        if (executingUserId instanceof NextResponse) {
            return executingUserId;
        }

        const parsed = schema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json({ error: 'Die Eingaben sind ungültig.', issues: parsed.error.issues }, { status: 400 });
        }

        return await action(parsed.data, executingUserId, getClientIP(req));
    } catch (error: unknown) {
        // Do not pass the message on, it can contain internals from Keycloak or the database.
        // eslint-disable-next-line no-console
        console.error(`[${tag}]`, error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
};
