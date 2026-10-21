import { and, desc, eq, inArray, lte } from 'drizzle-orm';
import type { DayEntries } from './hrpLogic';
import { db } from '@/db';
import type { HrpContractEntry } from '@/db/schema';
import * as schema from '@/db/schema';
import { HRP_EMPLOYER_GROUP_IDS } from '@/lib/constants';
import { getContractAtDate } from '@/lib/db/contractActions';
import { getHrpLogForUser } from '@/lib/db/hrpActions';
import { computeDayStats } from '@/lib/hrp/hrpLogic';

// B-Side GmbH has a special overtime cap of 20 hours. This is a business rule that is hardcoded here for now.
const GMBH_GROUP_ID = HRP_EMPLOYER_GROUP_IDS.gmbh;
const OVERTIME_CAP_HOURS = 20;

export interface BalanceSummary {
    carryoverFromLastYear: number;
    balanceChangeInPreviousMonths: number;
    balanceAtStartOfMonthUncapped: number;
    cappedHoursInCarryover: number;
    cappedHoursThisMonth: number;
    balanceAtStartOfMonthCapped: number;
    balanceCurrentMonth: number;
    finalBalanceUncapped: number;
    finalBalanceCapped: number;
    // For display
    isCapped: boolean;
    capValue: number;
    contract: HrpContractEntry | null;
}

function getDaysInMonth(year: number, monthZeroBased: number): number {
    return new Date(year, monthZeroBased + 1, 0).getDate();
}

/** Nur Festanstellungen führen ein Gleitzeitkonto. */
function isFixedSalary(contract?: { type: string } | null): boolean {
    return contract?.type === 'fixed_salary';
}

/**
 * Vertrag, der an `date` gültig ist. Erwartet nach validFrom absteigend sortierte Verträge.
 * Laufen mehrere Verträge parallel, gewinnt die Festanstellung – sonst würde ein zusätzlicher
 * Stundenvertrag das Gleitzeitkonto fälschlich beenden.
 */
function findContractAtDate<T extends { type: string; validFrom: Date; validTo: Date | null }>(
    contracts: Array<T>,
    date: Date,
): T | undefined {
    const valid = contracts.filter((c) => {
        const validFrom = new Date(c.validFrom);
        const validTo = c.validTo ? new Date(c.validTo) : null;
        return validFrom <= date && (!validTo || validTo >= date);
    });

    return valid.find((c) => isFixedSalary(c)) ?? valid[0];
}

/**
 * Calculates the balance for a single calendar month from raw event and absence data.
 * This is the single source of truth for a month's balance calculation.
 */
async function calculateCalendarMonthBalance(userId: string, year: number, month: number /* 1-based */): Promise<number> {
    // Check if a finalized payroll for this month exists. If so, it's the source of truth.
    const payrollEntry = await db.query.hrpPayrollFixedTable.findFirst({
        where: and(
            eq(schema.hrpPayrollFixedTable.year, year),
            eq(schema.hrpPayrollFixedTable.month, month),
            inArray(
                schema.hrpPayrollFixedTable.contractId,
                db
                    .select({ id: schema.hrpContractsTable.id })
                    .from(schema.hrpContractsTable)
                    .where(and(eq(schema.hrpContractsTable.userId, userId), eq(schema.hrpContractsTable.type, 'fixed_salary'))),
            ),
        ),
    });

    // If the month is finalized, its creditedHours are the definitive balance.
    if (payrollEntry && payrollEntry.status === 'finalized') {
        return parseFloat(payrollEntry.creditedHours?.toString() ?? '0');
    }

    // If not finalized, calculate from scratch
    const logs = await getHrpLogForUser(userId, year, month - 1); // getHrpLogForUser expects 0-indexed month

    const daysInMonth = getDaysInMonth(year, month - 1);
    const dayRefs = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1 }));

    const dayStats = await Promise.all(
        dayRefs.map(async (ref) => {
            const refDate = new Date(year, month - 1, ref.day);
            const contractAtDate = await getContractAtDate(userId, refDate);
            const entries = (logs?.[ref.day] ?? []) as DayEntries;

            return computeDayStats(
                entries,
                contractAtDate
                    ? {
                          weeklyHours: contractAtDate.weeklyHours,
                          workingDays: contractAtDate.workingDays,
                          type: contractAtDate.type,
                      }
                    : undefined,
                refDate,
            );
        }),
    );

    const totalBalanceMinutes = dayStats.reduce((acc, s) => acc + s.balanceMinutes, 0);

    return totalBalanceMinutes / 60;
}

/**
 * Calculates the complete overtime balance summary for a given user, year, and month.
 */
export async function calculateBalanceSummary(
    userId: string,
    year: number,
    month: number,
    balanceCurrentMonth: number,
): Promise<BalanceSummary> {
    const beginningOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const userContracts = await db.query.hrpContractsTable.findMany({
        where: and(eq(schema.hrpContractsTable.userId, userId), lte(schema.hrpContractsTable.validFrom, endOfYear)),
        orderBy: desc(schema.hrpContractsTable.validFrom),
    });

    const relevantContracts = userContracts.filter((c) => !c.validTo || c.validTo >= beginningOfYear);

    if (relevantContracts.length === 0) {
        // Return a zeroed-out summary if there are no relevant contracts
        return {
            carryoverFromLastYear: 0,
            balanceChangeInPreviousMonths: 0,
            balanceAtStartOfMonthUncapped: 0,
            cappedHoursInCarryover: 0,
            cappedHoursThisMonth: 0,
            balanceAtStartOfMonthCapped: 0,
            balanceCurrentMonth,
            finalBalanceUncapped: balanceCurrentMonth,
            finalBalanceCapped: balanceCurrentMonth,
            isCapped: false,
            capValue: 0,
            contract: null,
        };
    }

    const dateInSelectedMonth = new Date(year, month - 1, 15);
    const activeContractForMonth = findContractAtDate(relevantContracts, dateInSelectedMonth) ?? relevantContracts[0];

    // Der Überstunden-Startsaldo aus dem Vorjahr gilt nur für Festanstellungen.
    // Jahreskonten ausgelaufener Stundenverträge dürfen nicht in ein Gleitzeitkonto einfließen.
    const fixedContractIds = relevantContracts.filter((c) => isFixedSalary(c)).map((c) => c.id);

    const leaveAccounts =
        fixedContractIds.length > 0
            ? await db.query.hrpLeaveAccountsTable.findMany({
                  where: and(
                      inArray(schema.hrpLeaveAccountsTable.contractId, fixedContractIds),
                      eq(schema.hrpLeaveAccountsTable.year, year),
                  ),
              })
            : [];

    const carryoverFromLastYear = leaveAccounts.reduce((sum, acc) => sum + parseFloat(acc.overtimeCarryoverHours?.toString() ?? '0'), 0);

    // Iteratively calculate the balance up to the start of the selected month, applying capping at each step.
    let runningCappedBalance = carryoverFromLastYear;
    let runningUncappedBalance = carryoverFromLastYear;

    for (let i = 1; i < month; i++) {
        const dateInMonthI = new Date(year, i - 1, 15);
        const contractForMonthI = findContractAtDate(relevantContracts, dateInMonthI);

        // Ein Stundenvertrag (oder eine vertragslose Lücke) beendet das Gleitzeitkonto.
        if (!isFixedSalary(contractForMonthI)) {
            runningCappedBalance = 0;
            runningUncappedBalance = 0;
        }

        const monthBalanceChange = await calculateCalendarMonthBalance(userId, year, i);
        runningUncappedBalance += monthBalanceChange;

        const endOfMonthUncapped = runningCappedBalance + monthBalanceChange;

        const isGmbhContractInMonthI = contractForMonthI?.employerGroupId === GMBH_GROUP_ID && isFixedSalary(contractForMonthI);

        let endOfMonthCapped = endOfMonthUncapped;
        if (isGmbhContractInMonthI && endOfMonthUncapped > OVERTIME_CAP_HOURS) {
            endOfMonthCapped = OVERTIME_CAP_HOURS;
        }
        runningCappedBalance = endOfMonthCapped;
    }

    const balanceAtStartOfMonthCapped = runningCappedBalance;
    const balanceAtStartOfMonthUncapped = runningUncappedBalance;
    const cappedHoursInCarryover = balanceAtStartOfMonthUncapped - balanceAtStartOfMonthCapped;
    const balanceChangeInPreviousMonths = balanceAtStartOfMonthUncapped - carryoverFromLastYear;

    // Start the calculation for the selected month.
    const isGmbhContract = activeContractForMonth?.employerGroupId === GMBH_GROUP_ID && activeContractForMonth?.type === 'fixed_salary';

    // The final uncapped balance includes the full history + current month's uncapped change
    const finalBalanceUncapped = balanceAtStartOfMonthUncapped + balanceCurrentMonth;

    // The final capped balance calculation starts from the correctly capped carry-over
    const finalBalanceIntermediate = balanceAtStartOfMonthCapped + balanceCurrentMonth;

    let finalBalanceCapped = finalBalanceIntermediate;
    let cappedHoursThisMonth = 0;
    if (isGmbhContract && finalBalanceIntermediate > OVERTIME_CAP_HOURS) {
        cappedHoursThisMonth = finalBalanceIntermediate - OVERTIME_CAP_HOURS;
        finalBalanceCapped = OVERTIME_CAP_HOURS;
    }

    return {
        carryoverFromLastYear,
        balanceChangeInPreviousMonths,
        balanceAtStartOfMonthUncapped,
        cappedHoursInCarryover,
        cappedHoursThisMonth,
        balanceAtStartOfMonthCapped,
        balanceCurrentMonth,
        finalBalanceUncapped,
        finalBalanceCapped,
        isCapped: isGmbhContract,
        capValue: OVERTIME_CAP_HOURS,
        contract: activeContractForMonth ?? null,
    };
}
