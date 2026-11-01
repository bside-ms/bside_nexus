import type { Session } from 'next-auth';
import getUserSession from '@/lib/auth/getUserSession';
import { HRP_CORRECTION_GROUP_IDS } from '@/lib/constants';
import { getGroupAdminStatus, isGlobalAdmin } from '@/lib/db/groupActions';
import type { ContractDetails } from '@/lib/db/hrpAdminActions';
import { canManageContract, getContractById } from '@/lib/db/hrpAdminActions';
import type { HrpAdminActor } from '@/lib/hrp/corrections';
import { addOneBerlinDay, toBerlinDateString } from '@/lib/hrp/hrpLogic';
import { getClientIP } from '@/lib/utils/getClientIP';
import isNotEmptyString from '@/lib/utils/isNotEmptyString';

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

export interface ContractEditorAccess {
    session: Session['user'];
    contract: ContractDetails;
}

/**
 * Darf der User Buchungen und Abwesenheiten des Vertrags korrigieren?
 * System-Admins dürfen alle Verträge. Sonst nur Mitglieder der Korrekturgruppe und nie beim eigenen Vertrag.
 */
export async function getContractEditorAccess(contractId: string): Promise<ContractEditorAccess | null> {
    const session = await getUserSession();
    if (session === null || !(session.roles?.includes(HRP_ADMIN_ROLE) ?? false)) {
        return null;
    }

    const contract = await getContractById(contractId);
    if (contract === null) {
        return null;
    }

    if (isGlobalAdmin(session.id)) {
        return { session, contract };
    }

    if (contract.userId === session.id || !(await canManageContract(session.id, contractId))) {
        return null;
    }

    const correctionGroupId = HRP_CORRECTION_GROUP_IDS[contract.employerGroupId] ?? null;
    if (correctionGroupId === null || (await getGroupAdminStatus(session.id, correctionGroupId)) === 'None') {
        return null;
    }

    return { session, contract };
}

export const buildAdminActor = (session: Session['user'], req: Request, reason: string): HrpAdminActor => ({
    userId: session.id,
    name: isNotEmptyString(session.name) ? session.name : session.username,
    ipAddress: isNotEmptyString(getClientIP(req)) ? getClientIP(req) : 'unknown',
    reason,
});

/**
 * Liegt die Buchung in der Vertragslaufzeit?
 * Gehen und Pausen dürfen einen Tag danach liegen (Nachtschicht).
 */
export const isWithinContract = (contract: ContractDetails, entryType: string, timestamp: Date): boolean => {
    const day = toBerlinDateString(timestamp);
    if (day < toBerlinDateString(contract.validFrom)) {
        return false;
    }
    if (contract.validTo === null) {
        return true;
    }
    const lastDay = toBerlinDateString(entryType === 'start' ? contract.validTo : addOneBerlinDay(contract.validTo));
    return day <= lastDay;
};
