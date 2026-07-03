import { and, desc, eq, inArray, lte } from 'drizzle-orm';
import type { DayEntries } from './hrpLogic';
import { db } from '@/db';
import type { HrpContractEntry } from '@/db/schema';
import * as schema from '@/db/schema';
import { getContractAtDate } from '@/lib/db/contractActions';
import { getHrpLogForUser } from '@/lib/db/hrpActions';
import { computeDayStats } from '@/lib/hrp/hrpLogic';

// B-Side GmbH has a special overtime cap of 20 hours. This is a business rule that is hardcoded here for now.
const GMBH_GROUP_ID = '1680099c-78e1-423c-bc70-92bec57e2f75';
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
                    .where(eq(schema.hrpContractsTable.userId, userId)),
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
    const activeContractForMonth =
        relevantContracts.find((c) => {
            const validFrom = new Date(c.validFrom);
            const validTo = c.validTo ? new Date(c.validTo) : null;
            return validFrom <= dateInSelectedMonth && (!validTo || validTo >= dateInSelectedMonth);
        }) ?? relevantContracts[0];

    const leaveAccounts = await db.query.hrpLeaveAccountsTable.findMany({
        where: and(
            inArray(
                schema.hrpLeaveAccountsTable.contractId,
                relevantContracts.map((c) => c.id),
            ),
            eq(schema.hrpLeaveAccountsTable.year, year),
        ),
    });

    const carryoverFromLastYear = leaveAccounts.reduce((sum, acc) => sum + parseFloat(acc.overtimeCarryoverHours?.toString() ?? '0'), 0);

    // Iteratively calculate the balance up to the start of the selected month, applying capping at each step.
    let runningCappedBalance = carryoverFromLastYear;
    let runningUncappedBalance = carryoverFromLastYear;

    for (let i = 1; i < month; i++) {
        const monthBalanceChange = await calculateCalendarMonthBalance(userId, year, i);
        runningUncappedBalance += monthBalanceChange;

        const endOfMonthUncapped = runningCappedBalance + monthBalanceChange;

        const dateInMonthI = new Date(year, i - 1, 15);
        const contractForMonthI =
            relevantContracts.find((c) => {
                const validFrom = new Date(c.validFrom);
                const validTo = c.validTo ? new Date(c.validTo) : null;
                return validFrom <= dateInMonthI && (!validTo || validTo >= dateInMonthI);
            }) ?? relevantContracts[0];

        const isGmbhContractInMonthI = contractForMonthI?.employerGroupId === GMBH_GROUP_ID && contractForMonthI?.type === 'fixed_salary';

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
