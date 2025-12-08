import getUserSession from '@/lib/auth/getUserSession';

interface RoleGuardResult {
    isAllowed: boolean;
    userId: string | null;
    displayName: string | null;
}

/**
 * Simple role guard using NextAuth session roles array.
 * Example usage:
 *   const guard = await requireRole('schluesselverwaltung');
 *   if (!guard.isAllowed) return new Response('Forbidden', { status: 403 });
 */
const requireRole = async (role: string): Promise<RoleGuardResult> => {
    const session = await getUserSession();
    const isAllowed = session?.roles?.includes(role) ?? false;
    return {
        isAllowed,
        userId: session?.id ?? null,
        displayName: session?.name ?? null,
    };
};

export default requireRole;
