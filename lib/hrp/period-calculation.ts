
import { getContractAtDate } from '../db/contractActions';
import { getHrpLogForUser } from '@/lib/db/hrpActions';
import type { DayEntries, DayStats } from '@/lib/hrp/hrpLogic';
import { computeDayStats } from '@/lib/hrp/hrpLogic';

export type PeriodMode = 'calendar' | '23-22' | '15-14';

export interface DayRef {
    source: 'curr' | 'prev';
    day: number;
}

interface Totals {
    gross: number;
    breakActual: number;
    breakAdjusted: number;
    net: number;
    target: number;
    balance: number;
}

// dayStats in the page has an extra `absences` property.
type DayStatsWithAbsences = DayStats & { absences: DayEntries };

function getDaysInMonth(year: number, monthZeroBased: number): number {
    return new Date(year, monthZeroBased + 1, 0).getDate();
}

function buildDayArray<T>(count: number, map: (indexZero: number) => T): Array<T> {
    return Array.from({ length: count }, (_, i) => map(i));
}

export async function calculatePeriodTotals(userId: string, year: number, month: number, period: PeriodMode): Promise<{ totals: Totals, dayStats: Array<DayStatsWithAbsences>, dayRefs: Array<DayRef> }> {
    
    const logsCurrent = await getHrpLogForUser(userId, year, month);

    const prevEdge = new Date(year, month, 0);
    const prevYear = prevEdge.getFullYear();
    const prevMonth = prevEdge.getMonth();
    const logsPrev = period !== 'calendar' ? await getHrpLogForUser(userId, prevYear, prevMonth) : undefined;

    let dayRefs: Array<DayRef> = [];
    if (period === 'calendar') {
        const dim = getDaysInMonth(year, month);
        dayRefs = buildDayArray(dim, (i) => ({ source: 'curr', day: i + 1 }));
    } else if (period === '23-22') {
        const daysInPrev = new Date(year, month, 0).getDate();
        const prevPart: Array<DayRef> = [];
        for (let d = 23; d <= daysInPrev; d++) {
            prevPart.push({ source: 'prev', day: d });
        }
        const currPart: Array<DayRef> = [];
        for (let d = 1; d <= 22; d++) {
            currPart.push({ source: 'curr', day: d });
        }
        dayRefs = [...prevPart, ...currPart];
    } else if (period === '15-14') {
        const daysInPrev = new Date(year, month, 0).getDate();
        const prevPart: Array<DayRef> = [];
        for (let d = 15; d <= daysInPrev; d++) {
            prevPart.push({ source: 'prev', day: d });
        }
        const currPart: Array<DayRef> = [];
        for (let d = 1; d <= 14; d++) {
            currPart.push({ source: 'curr', day: d });
        }
        dayRefs = [...prevPart, ...currPart];
    }

    const dayStats = await Promise.all(
        dayRefs.map(async (ref) => {
            const dYear = ref.source === 'curr' ? year : prevYear;
            const dMonth = ref.source === 'curr' ? month : prevMonth;
            const refDate = new Date(dYear, dMonth, ref.day);

            const contractAtDate = await getContractAtDate(userId, refDate);

            const entries =
                ref.source === 'prev' ? ((logsPrev?.[ref.day] ?? []) as DayEntries) : ((logsCurrent?.[ref.day] ?? []) as DayEntries);

            const stats = computeDayStats(
                entries,
                contractAtDate
                    ? {
                          weeklyHours: contractAtDate.weeklyHours,
                          workingDays: contractAtDate.workingDays,
                          type: contractAtDate.type,
                      }
                    : undefined,
                refDate
            );
            
            const absences = entries.filter((e) => e.entryType === 'absence');
            return { ...stats, absences };
        }),
    );

    const totals = dayStats.reduce(
        (acc, s) => {
            acc.gross += s.sessionMinutes;
            acc.breakActual += s.actualBreakMinutes;
            acc.breakAdjusted += s.adjustedBreakMinutes;
            acc.net += s.netMinutes;
            acc.target += s.targetMinutes;
            acc.balance += s.balanceMinutes;
            return acc;
        },
        { gross: 0, breakActual: 0, breakAdjusted: 0, net: 0, target: 0, balance: 0 },
    );

    return { totals, dayStats, dayRefs };
}
