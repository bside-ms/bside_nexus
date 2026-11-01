import type { Session } from 'next-auth';
import getUserSession from '@/lib/auth/getUserSession';
import { canManageContract } from '@/lib/db/hrpAdminActions';

export const HRP_ADMIN_ROLE = 'arbeitszeiterfassung-admin';

/**
 *  Session des aktuellen Users, wenn er HRP-Admin ist und den Vertrag verwaltet.
 */
export async function getContractAdminSession(contractId: string): Promise<Session['user'] | null> {
    const session = await getUserSession();
    if (session === null || !(session.roles?.includes(HRP_ADMIN_ROLE) ?? false)) {
        return null;
    }

    return (await canManageContract(session.id, contractId)) ? session : null;
}
