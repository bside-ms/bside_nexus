import { and, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm';
import { db } from '@/db';
import { hrpAbsencesTable, hrpContractsTable, hrpLeaveAccountsTable } from '@/db/schema';

interface VacationAccountDetails {
    annualEntitlement: number;
    carryOver: number;
    carryOverUsed: number;
    taken: {
        total: number;
        fromCarryOver: number;
        fromAnnual: number;
    };
    planned: number;
    available: number;
    isCarryOverExpired: boolean;
}

/**
 * Calculates the vacation account details for a given user and target date.
 *
 * @param userId - The ID of the user.
 * @param targetDate - The date for which to calculate the details.
 * @returns A promise that resolves to the vacation account details.
 */
export async function getVacationAccountDetails(userId: string, targetDate: Date): Promise<VacationAccountDetails> {
    const year = targetDate.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    const lastDayOfYear = new Date(year, 11, 31);

    // Find all contracts for the user active in the target year.
    // A contract is considered active in the year if its activity period overlaps with the year.
    const userContracts = await db
        .select({
            id: hrpContractsTable.id,
        })
        .from(hrpContractsTable)
        .where(
            and(
                eq(hrpContractsTable.userId, userId),
                lte(hrpContractsTable.validFrom, lastDayOfYear), // Starts before or during the year
                or(
                    gte(hrpContractsTable.validTo, firstDayOfYear), // Ends on or after the year starts
                    isNull(hrpContractsTable.validTo), // Or has no end date
                ),
            ),
        );

    if (userContracts.length === 0) {
        return {
            annualEntitlement: 0,
            carryOver: 0,
            carryOverUsed: 0,
            taken: { total: 0, fromCarryOver: 0, fromAnnual: 0 },
            planned: 0,
            available: 0,
            isCarryOverExpired: false,
        };
    }

    const contractIds = userContracts.map((c) => c.id);

    // Get leave accounts for these contracts for the target year
    const leaveAccounts = await db
        .select({
            totalVacationDays: hrpLeaveAccountsTable.totalVacationDays,
            remainingDaysFromLastYear: hrpLeaveAccountsTable.remainingDaysFromLastYear,
        })
        .from(hrpLeaveAccountsTable)
        .where(and(eq(hrpLeaveAccountsTable.year, year), inArray(hrpLeaveAccountsTable.contractId, contractIds)));

    const annualEntitlement = leaveAccounts.reduce((sum, acc) => sum + (acc.totalVacationDays || 0), 0);
    const carryOver = leaveAccounts.reduce((sum, acc) => sum + (acc.remainingDaysFromLastYear || 0), 0);

    // Get all 'vacation' absences for the year
    const absences = await db
        .select({
            date: hrpAbsencesTable.date,
        })
        .from(hrpAbsencesTable)
        .where(
            and(
                inArray(hrpAbsencesTable.contractId, contractIds),
                eq(hrpAbsencesTable.type, 'vacation'),
                gte(hrpAbsencesTable.date, firstDayOfYear.toISOString().split('T')[0]!),
                lte(hrpAbsencesTable.date, lastDayOfYear.toISOString().split('T')[0]!),
                isNull(hrpAbsencesTable.deletedAt),
            ),
        );

    // Apply business logic
    const expirationDate = new Date(year, 3, 1); // April 1st
    const isCarryOverExpiredByTargetDate = targetDate >= expirationDate;

    // --- Taken Days Breakdown ---
    const pastAbsences = absences.filter((a) => new Date(a.date) <= targetDate);
    const pastAbsencesBeforeExpiration = pastAbsences.filter((a) => new Date(a.date) < expirationDate);
    const takenTotal = pastAbsences.length;
    const takenFromCarryOver = Math.min(pastAbsencesBeforeExpiration.length, carryOver);
    const takenFromAnnual = takenTotal - takenFromCarryOver;

    // --- Expiration Logic ---
    // To calculate what's lost, we need to check all absences before April 1st for the whole year
    const allAbsencesBeforeExpiration = absences.filter((a) => new Date(a.date) < expirationDate);
    const carryOverUsed = Math.min(allAbsencesBeforeExpiration.length, carryOver);
    const carryOverLost = carryOver - carryOverUsed;

    // --- Final Counts ---
    const planned = absences.filter((a) => new Date(a.date) > targetDate).length;

    // The total pool of days available for the whole year.
    const totalYearlyEntitlement = annualEntitlement + carryOver;

    // Start with the total potential pool...
    let available = totalYearlyEntitlement - takenTotal - planned;
    // ...and if the expiration date has passed, subtract the days that were lost.
    if (isCarryOverExpiredByTargetDate) {
        available -= carryOverLost;
    }

    return {
        annualEntitlement,
        carryOver,
        carryOverUsed,
        taken: {
            total: takenTotal,
            fromCarryOver: takenFromCarryOver,
            fromAnnual: takenFromAnnual,
        },
        planned,
        available,
        isCarryOverExpired: isCarryOverExpiredByTargetDate,
    };
}
