import { and, eq, gte, isNull, lt } from 'drizzle-orm';
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { PayrollHourlyClient } from '@/components/hrp/PayrollHourlyClient';
import { PrintButton } from '@/components/hrp/PrintButton';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { db } from '@/db';
import type { HrpEventLogEntry, HrpMonthlyPayrollEntry } from '@/db/schema';
import { hrpEventLogTable, usersTable } from '@/db/schema';
import getUserSession from '@/lib/auth/getUserSession';
import { getActiveContractsForUser } from '@/lib/db/contractActions';
import { getUpcomingVacations } from '@/lib/db/hrpAbsenceActions';
import { getHrpLogsForAllUsers } from '@/lib/db/hrpActions';
import { getLeaveAccounts, getManagedContracts, getPreviousPayrollHourly, getUnbilledLogs } from '@/lib/db/hrpAdminActions';
import type { DayEntries } from '@/lib/hrp/hrpLogic';
import { groupEntriesByWorkday } from '@/lib/hrp/hrpLogic';
import { computeDayStats, toTimeStr } from '@/lib/hrp/hrpLogic';

const breadCrumbs = [
    { title: 'Zeiterfassung', url: '/hrp' },
    { title: 'Administration', url: '/hrp/admin' },
    { title: 'Abrechnungsübersicht', active: true },
];

export const metadata: Metadata = {
    description: 'Arbeitszeiterfassung im internen Portal der B-Side',
    robots: 'noindex, nofollow',
};

type PeriodMode = 'calendar' | '23-22' | '15-14';

function getDaysInMonth(year: number, monthZeroBased: number): number {
    return new Date(year, monthZeroBased + 1, 0).getDate();
}

function cap(s: string): string {
    if (!s) {
        return s;
    }
    return s[0]?.toUpperCase() + s.slice(1);
}

const parseFromObject = (searchParams: Record<string, string | Array<string> | undefined>) => {
    const now = new Date();
    const rawMonth = Array.isArray(searchParams?.month) ? searchParams?.month[0] : searchParams?.month;
    const rawYear = Array.isArray(searchParams?.year) ? searchParams?.year[0] : searchParams?.year;
    const rawUser = Array.isArray(searchParams?.user) ? searchParams?.user[0] : searchParams?.user;
    const rawPeriod = Array.isArray(searchParams?.period) ? searchParams?.period[0] : searchParams?.period;
    const rawContract = Array.isArray(searchParams?.contractId) ? searchParams?.contractId[0] : searchParams?.contractId;

    const year = Number.isFinite(Number(rawYear)) ? Number(rawYear) : now.getFullYear();
    const mCandidate = Number(rawMonth);
    const month = Number.isFinite(mCandidate) && mCandidate >= 1 && mCandidate <= 12 ? mCandidate - 1 : now.getMonth();
    const period: PeriodMode = rawPeriod === '15-14' ? '15-14' : rawPeriod === '23-22' ? '23-22' : 'calendar';

    return { year, month, period, initialUserId: rawUser, contractId: rawContract };
};

const monthLabel = (year: number, monthZeroBased: number) =>
    cap(
        new Date(year, monthZeroBased, 1).toLocaleDateString('de-DE', {
            month: 'long',
            year: 'numeric',
            timeZone: 'Europe/Berlin',
        }),
    );

const altPeriodLabel = (year: number, monthZeroBased: number, period: PeriodMode): string => {
    const prevEdge = new Date(year, monthZeroBased, 0); // letzter Tag Vormonat
    const prevY = prevEdge.getFullYear();
    const prevM = prevEdge.getMonth();
    const prevMonthName = cap(new Date(prevY, prevM, 1).toLocaleDateString('de-DE', { month: 'long', timeZone: 'Europe/Berlin' }));
    const currMonthName = cap(
        new Date(year, monthZeroBased, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' }),
    );
    if (period === '15-14') {
        return `15. ${prevMonthName} – 14. ${currMonthName}`;
    }
    return `23. ${prevMonthName} – 22. ${currMonthName}`;
};

const toHHMM = (totalMinutes: number): string => {
    const absMinutes = Math.abs(totalMinutes);
    const h = Math.floor(absMinutes / 60);
    const m = absMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const sumToHHMM = (totalMinutes: number): string => {
    const sign = totalMinutes < 0 ? '-' : totalMinutes > 0 ? '+' : '';
    return `${sign}${toHHMM(totalMinutes)}`;
};

function buildDayArray<T>(count: number, map: (indexZero: number) => T): Array<T> {
    return Array.from({ length: count }, (_, i) => map(i));
}

const getUserLabel = (u: { username: string; displayName: string | null }): string => {
    return u.displayName?.trim() || u.username;
};

// Mitarbeitende mit Einträgen im Kalenderjahr
const getUsersWithEntriesForYear = async (year: number) => {
    const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
    const startOfNextYear = new Date(year + 1, 0, 1, 0, 0, 0, 0);

    const rows = await db
        .select({
            userId: hrpEventLogTable.userId,
            username: usersTable.username,
            displayName: usersTable.displayName,
        })
        .from(hrpEventLogTable)
        .leftJoin(usersTable, eq(usersTable.id, hrpEventLogTable.userId))
        .where(and(gte(hrpEventLogTable.loggedTimestamp, startOfYear), lt(hrpEventLogTable.loggedTimestamp, startOfNextYear)));

    const userMeta = new Map<string, { username: string; displayName: string | null }>();
    for (const r of rows) {
        if (!r.userId) {
            continue;
        }
        userMeta.set(r.userId, { username: r.username ?? r.userId, displayName: r.displayName ?? null });
    }

    const users = Array.from(userMeta.entries()).map(([id, meta]) => ({
        id,
        label: getUserLabel({ username: meta.username, displayName: meta.displayName }),
    }));
    users.sort((a, b) => a.label.localeCompare(b.label, 'de'));
    return users;
};

export default async function Page({
    searchParams,
}: {
    searchParams?: Promise<Record<string, string | Array<string> | undefined>>;
}): Promise<ReactElement> {
    const session = await getUserSession();
    const isAllowed = session?.roles?.includes('arbeitszeiterfassung-admin') ?? false;
    if (session === null || !isAllowed) {
        return (
            <div>
                <NavbarTop items={breadCrumbs} sidebar={true} />
                <div className="p-8">
                    <h1 className="text-2xl font-bold underline">Fehlende Berechtigungen</h1>
                    <p className="mt-4">
                        Du hast nicht die notwendigen Berechtigungen, um auf diese Seite der Arbeitszeiterfassung zuzugreifen.
                    </p>
                    <p className="mt-4">Bitte kontaktiere eine Administrator*in, wenn du dies für einen Fehler hälst.</p>
                </div>
            </div>
        );
    }

    const sp = (await searchParams) ?? {};
    const { year, month, period, initialUserId, contractId: rawContractId } = parseFromObject(sp);

    // Welche Verträge darf der Admin verwalten?
    const managedContracts = await getManagedContracts(session.id);

    if (managedContracts.length === 0) {
        return (
            <div>
                <NavbarTop items={breadCrumbs} sidebar={true} />
                <div className="p-8">
                    <h1 className="text-2xl font-bold underline">Keine verwalteten Verträge</h1>
                    <p className="mt-4">Du verwaltest aktuell keine Gruppen mit aktiven Verträgen in der Arbeitszeiterfassung.</p>
                    <p className="mt-4">Bitte kontaktiere eine Administrator*in, wenn du dies für einen Fehler hälst.</p>
                </div>
            </div>
        );
    }

    const managedUserIds = new Set(managedContracts.map((c) => c.userId));

    // Nutzerliste (Kalenderjahr) und Monatslogs holen
    const allUserOptions = await getUsersWithEntriesForYear(year);
    // Nur Nutzer anzeigen, für die der Admin mindestens einen Vertrag verwalten darf
    const userOptionsYear = allUserOptions.filter((u) => managedUserIds.has(u.id));

    const selectedUserId = initialUserId && userOptionsYear.some((u) => u.id === initialUserId) ? initialUserId : userOptionsYear[0]?.id;

    // Verträge für den gewählten Nutzer laden
    const allContracts = selectedUserId ? await getActiveContractsForUser(selectedUserId) : [];
    // Nur Verträge anzeigen, die der Admin tatsächlich verwalten darf
    const managedContractIdsForSelectedUser = new Set(managedContracts.filter((c) => c.userId === selectedUserId).map((c) => c.id));
    const contracts = allContracts.filter((c) => managedContractIdsForSelectedUser.has(c.contractId));

    const selectedContractId =
        rawContractId && contracts.some((c) => c.contractId === rawContractId) ? rawContractId : contracts[0]?.contractId;

    const selectedContract = contracts.find((c) => c.contractId === selectedContractId);

    // Nicht abgerechnete Stunden für Payroll-Vorschau
    let unbilledLogs: Array<HrpEventLogEntry> = [];
    let previousPayroll: HrpMonthlyPayrollEntry | null = null;
    if (selectedUserId && selectedContractId && selectedContract?.type === 'hourly') {
        const edge = new Date(year, month, 23, 0, 0, 0, 0); // Ende des aktuellen Zeitraums (22. 23:59:59)
        // Wir laden unbilled logs ohne Zeitbeschränkung nach hinten, um ALLES zu erfassen
        unbilledLogs = await getUnbilledLogs(selectedUserId, selectedContractId, edge);
        previousPayroll = await getPreviousPayrollHourly(selectedContractId, year, month);
    }

    // Für die korrekte Gruppierung brauchen wir auch bereits abgerechnete Logs als Kontext
    let contextLogs: Array<HrpEventLogEntry> = [];
    if (selectedUserId && selectedContractId && selectedContract?.type === 'hourly') {
        // Lade alle Logs der letzten 60 Tage als Kontext (sollte für Schichtübergänge reichen)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        contextLogs = (await db
            .select()
            .from(hrpEventLogTable)
            .where(
                and(
                    eq(hrpEventLogTable.userId, selectedUserId),
                    eq(hrpEventLogTable.contractId, selectedContractId),
                    gte(hrpEventLogTable.loggedTimestamp, sixtyDaysAgo),
                    isNull(hrpEventLogTable.deletedAt),
                ),
            )
            .orderBy(hrpEventLogTable.loggedTimestamp)) as Array<HrpEventLogEntry>;
    }

    const unbilledByDay =
        selectedUserId && selectedContractId && selectedContract?.type === 'hourly'
            ? groupEntriesByWorkday([...contextLogs]) // groupEntriesByWorkday handles duplicates or we just use contextLogs which should include unbilled too
            : {};

    // Filter unbilledByDay to only include days that actually have unbilled logs
    const filteredUnbilledByDay: Record<string, Array<HrpEventLogEntry>> = {};
    const unbilledSet = new Set(unbilledLogs.map((l) => l.id));
    Object.entries(unbilledByDay).forEach(([dateStr, entries]) => {
        if (entries.some((e) => unbilledSet.has(e.id))) {
            filteredUnbilledByDay[dateStr] = entries;
        }
    });

    const logsCurrentByUser = await getHrpLogsForAllUsers(year, month, selectedContractId);

    // Für 23.–22.-Ansicht und 15.-14.-Ansicht auch Vormonat laden
    const prevEdge = new Date(year, month, 0);
    const prevYear = prevEdge.getFullYear();
    const prevMonth = prevEdge.getMonth();
    const logsPrevByUser = period !== 'calendar' ? await getHrpLogsForAllUsers(prevYear, prevMonth, selectedContractId) : undefined;

    const selectedCurrent = selectedUserId ? logsCurrentByUser[selectedUserId] : undefined;
    const selectedPrev = selectedUserId && logsPrevByUser ? logsPrevByUser[selectedUserId] : undefined;

    // Tage für Ansicht bestimmen
    interface DayRef {
        source: 'curr' | 'prev';
        day: number;
    }
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

    // Calculate daily stats
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(now);
    const currentHourBerlin = parseInt(
        new Intl.DateTimeFormat('de-DE', { hour: 'numeric', hour12: false, timeZone: 'Europe/Berlin' }).format(now),
        10,
    );

    // Tageswerte berechnen
    const dayStats = dayRefs.map((ref) => {
        const dYear = ref.source === 'curr' ? year : prevYear;
        const dMonth = ref.source === 'curr' ? month : prevMonth;
        const refDate = new Date(dYear, dMonth, ref.day);

        const entries =
            ref.source === 'prev'
                ? ((selectedPrev?.logs?.[ref.day] ?? []) as DayEntries)
                : ((selectedCurrent?.logs?.[ref.day] ?? []) as DayEntries);
        const stats = computeDayStats(
            entries,
            selectedContract
                ? {
                      weeklyHours: selectedContract.weeklyHours,
                      workingDays: selectedContract.workingDays,
                      type: selectedContract.type,
                  }
                : undefined,
            refDate,
            todayStr,
            currentHourBerlin,
        );

        // Abwesenheiten für Hinweise sammeln
        const absences = entries.filter((e) => e.entryType === 'absence');
        return { ...stats, absences };
    });

    // Monats-/Perioden-Summen
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

    // Fetch leave accounts for summary (overtime and vacation)
    const leaveAccounts = selectedContractId ? await getLeaveAccounts(selectedContractId) : [];
    const currentLeaveAccount = leaveAccounts.find((a) => a.year === year);

    const overtimeCarryover = parseFloat(currentLeaveAccount?.overtimeCarryoverHours?.toString() || '0');
    const monthlyBalanceHours = totals.balance / 60;
    const totalOvertimeUncapped = overtimeCarryover + monthlyBalanceHours;

    // TODO: Gekappte GLZ logic if applicable
    const cappedOvertime = 0;
    const totalOvertimeCapped = totalOvertimeUncapped - cappedOvertime;

    // Vacation summary logic
    const usedVacationDays = dayStats.reduce((acc, s) => {
        return acc + s.absences.filter((a) => a.absence?.type === 'vacation').length;
    }, 0);

    const plannedVacationDaysRow = selectedUserId ? await getUpcomingVacations(selectedUserId, year) : [];
    const plannedVacationDays = plannedVacationDaysRow.length;

    const vacationEntitlement = currentLeaveAccount?.totalVacationDays || selectedContract?.vacationDaysPerYear || 0;
    const carryoverDays = currentLeaveAccount?.remainingDaysFromLastYear || 0;
    const totalVacationAvailable = vacationEntitlement + carryoverDays;

    // Zeit-Token: gleiche Breite, zentriert, auf großen Displays etwas breiter (alle Zeitfenster gleich)
    const timeToken = 'inline-flex font-medium items-center justify-center w-[5ch] sm:w-[5.5ch] lg:w-[6ch]';

    // Aggregierte unbilled days für PayrollHourlyClient
    const unbilledDayStats = Object.entries(filteredUnbilledByDay)
        .map(([dateStr, entries]) => {
            const stats = computeDayStats(entries);
            return {
                dateStr,
                netMinutes: stats.netMinutes,
                issues: stats.issues.filter((issue) => !issue.includes('vor Mitternacht') && !issue.includes('nach Mitternacht')),
                entryIds: entries.map((e) => e.id),
            };
        })
        .sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    // Header & Auswahllisten
    const selectedUserLabel =
        userOptionsYear.find((u) => u.id === selectedUserId)?.label ??
        (selectedCurrent ? getUserLabel(selectedCurrent.user) : undefined) ??
        'Unbekannt';

    const monthOptions = Array.from({ length: 12 }, (_, i) => {
        const label = new Date(year, i, 1).toLocaleDateString('de-DE', { month: 'long' });
        return { value: i + 1, label: cap(label) };
    });

    // Jahresauswahl (aktuelles Jahr und 3 Jahre zurück)
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - i);

    // Aggregierte Hinweise
    const info = {
        daysUnder30: [] as Array<number>,
        daysUnder45: [] as Array<number>,
        daysUnmatchedSessions: [] as Array<number>,
        daysUnmatchedBreaks: [] as Array<number>,
        daysNoBookings: [] as Array<number>,
    };
    dayStats.forEach((s, idx) => {
        const d = idx + 1;
        if (s.breakWarning === 'under30') {
            info.daysUnder30.push(d);
        }
        if (s.breakWarning === 'under45') {
            info.daysUnder45.push(d);
        }
        if (s.issues.some((x: string) => x.includes('Fehlendes Start/Stop') || x.includes('Start/Stop-Reihenfolge'))) {
            info.daysUnmatchedSessions.push(d);
        }
        if (s.issues.some((x: string) => x.includes('Unvollständige Pause') || x.includes('Pausen-Reihenfolge'))) {
            info.daysUnmatchedBreaks.push(d);
        }
        if (s.issues.includes('Keine Buchungen') && s.absences.length === 0) {
            info.daysNoBookings.push(d);
        }
    });

    const infoBits: Array<string> = [];
    if (info.daysUnmatchedSessions.length > 0) {
        infoBits.push(`Fehlende/inkorrekte Start/Stop: Tage ${info.daysUnmatchedSessions.join(', ')}`);
    }
    if (info.daysUnmatchedBreaks.length > 0) {
        infoBits.push(`Unvollständige/inkorrekte Pausen: Tage ${info.daysUnmatchedBreaks.join(', ')}`);
    }
    if (info.daysUnder30.length > 0) {
        infoBits.push(`Pausen < 30 Min bei > 6h: Tage ${info.daysUnder30.join(', ')}`);
    }
    if (info.daysUnder45.length > 0) {
        infoBits.push(`Pausen < 45 Min bei > 9h: Tage ${info.daysUnder45.join(', ')}`);
    }
    if (info.daysNoBookings.length > 0) {
        infoBits.push(`Keine Buchungen: ${info.daysNoBookings.length} Tage`);
    }

    // Fetch current user (admin) label for print info
    const adminUserRow = await db
        .select({ username: usersTable.username, displayName: usersTable.displayName })
        .from(usersTable)
        .where(eq(usersTable.id, session.id))
        .limit(1);

    const adminLabel = getUserLabel({
        username: adminUserRow[0]?.username ?? 'Admin',
        displayName: adminUserRow[0]?.displayName ?? null,
    });

    const formattedDate = new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(now);

    const pdfFilename = `Arbeitszeit_Admin_${selectedUserLabel}_${now.toISOString().split('T')[0]}`;

    return (
        <div className="w-full overflow-x-hidden">
            <NavbarTop items={breadCrumbs} sidebar={true} className="print:hidden" />

            <div className="max-w-7xl p-4 sm:p-6 print:p-8 w-full space-y-4">
                {/* Print Info: Hidden on screen, shown in print */}
                <div className="hidden print:block text-[11pt] text-muted-foreground border-b-2 pb-2 mb-8">
                    <div className="flex justify-between">
                        <span>Erstellt am: {formattedDate}</span>
                        <span>
                            Erstellt von: {adminLabel} (Admin) für {selectedUserLabel}
                        </span>
                    </div>
                </div>

                {/* Header & Filter Wrapper */}
                <div className="space-y-4 break-after-avoid">
                    <div className="flex flex-col break-words">
                        <h1 className="text-2xl sm:text-3xl font-bold leading-tight print:text-[18pt]">
                            Arbeitszeiterfassung: {selectedUserLabel}
                        </h1>
                        <div className="text-sm sm:text-base md:text-lg text-muted-foreground print:text-[14pt] print:text-foreground">
                            {period === 'calendar' ? monthLabel(year, month) : altPeriodLabel(year, month, period)}
                        </div>
                    </div>

                    {/* Summary Wrapper (Only shown BEFORE table in print, hidden BEFORE table on web) */}
                    <div className="hidden print:grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 w-full print:mb-8">
                        {selectedContract?.type === 'fixed_salary' && (
                            <div className="rounded border bg-card p-6 text-card-foreground shadow-sm break-inside-avoid w-full">
                                <h2 className="text-[14pt] font-semibold mb-4 border-b-2 pb-2">Arbeitszeit & Saldo</h2>
                                <div className="space-y-3 text-[11pt] break-inside-avoid">
                                    <div className="flex justify-between border-b pb-1 text-muted-foreground print:text-foreground">
                                        <span>Wöchentliche Arbeitszeit:</span>
                                        <span className="font-medium text-foreground">{selectedContract.weeklyHours?.toFixed(2)} h</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1 text-muted-foreground print:text-foreground">
                                        <span>GLZ-Übertrag aus Vormonat:</span>
                                        <span className="font-medium text-foreground">{overtimeCarryover.toFixed(2)} h</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1 text-muted-foreground print:text-foreground">
                                        <span>GLZ-Saldo aktueller Zeitraum:</span>
                                        <span className="font-medium text-foreground">
                                            {monthlyBalanceHours >= 0 ? '+' : ''}
                                            {monthlyBalanceHours.toFixed(2)} h
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1 text-muted-foreground print:text-foreground">
                                        <span>GLZ-Saldo ungekappt:</span>
                                        <span className="font-medium text-foreground">{totalOvertimeUncapped.toFixed(2)} h</span>
                                    </div>
                                    <div className="flex justify-between pt-1 font-bold text-[12pt] border-t-2 border-zinc-300 mt-1">
                                        <span>GLZ-Saldo (Summe):</span>
                                        <span>{totalOvertimeCapped.toFixed(2)} h</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="rounded border bg-card p-6 text-card-foreground shadow-sm break-inside-avoid w-full">
                            <h2 className="text-[14pt] font-semibold mb-4 border-b-2 pb-2">Urlaubskonto {year}</h2>
                            <div className="space-y-3 text-[11pt] break-inside-avoid">
                                <div className="flex justify-between border-b pb-1 text-muted-foreground print:text-foreground">
                                    <span>Jahresanspruch:</span>
                                    <span className="font-medium text-foreground">{vacationEntitlement} Tage</span>
                                </div>
                                <div className="flex justify-between border-b pb-1 text-muted-foreground print:text-foreground">
                                    <span>Resturlaub Vorjahr:</span>
                                    <span className="font-medium text-foreground">{carryoverDays} Tage</span>
                                </div>
                                <div className="flex justify-between border-b pb-1 text-muted-foreground print:text-foreground">
                                    <span>Genommen im Zeitraum:</span>
                                    <span className="font-medium text-foreground">{usedVacationDays} Tage</span>
                                </div>
                                <div className="flex justify-between border-b pb-1 text-muted-foreground print:text-foreground">
                                    <span>Geplant (Zukunft):</span>
                                    <span className="font-medium text-foreground">{plannedVacationDays} Tage</span>
                                </div>
                                <div className="flex justify-between pt-1 font-bold text-[12pt] border-t-2 border-zinc-300 mt-1">
                                    <span>Verbleibend (Gesamtjahr):</span>
                                    <span>{totalVacationAvailable - usedVacationDays - plannedVacationDays} Tage</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filter */}
                    <form className="flex flex-wrap items-end gap-3 print:hidden" method="get">
                        <div className="flex flex-col gap-1 w-full sm:w-auto min-w-0">
                            <label className="text-xs font-medium text-muted-foreground" htmlFor="user-select">
                                Mitarbeiter
                            </label>
                            <select
                                id="user-select"
                                name="user"
                                defaultValue={selectedUserId ?? ''}
                                className="w-full sm:min-w-[12rem] rounded border bg-background px-3 py-2 text-sm appearance-none"
                            >
                                {userOptionsYear.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {contracts.length > 1 && (
                            <div className="flex flex-col gap-1 w-full sm:w-auto min-w-0">
                                <label className="text-xs font-medium text-muted-foreground" htmlFor="contract-select">
                                    Vertrag
                                </label>
                                <select
                                    id="contract-select"
                                    name="contractId"
                                    defaultValue={selectedContractId ?? ''}
                                    className="w-full sm:min-w-[12rem] rounded border bg-background px-3 py-2 text-sm appearance-none"
                                >
                                    {contracts.map((c) => (
                                        <option key={c.contractId} value={c.contractId}>
                                            {c.groupName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex flex-col gap-1 w-full sm:w-auto min-w-0">
                            <label className="text-xs font-medium text-muted-foreground" htmlFor="month-select">
                                Monat
                            </label>
                            <select
                                id="month-select"
                                name="month"
                                defaultValue={month + 1}
                                className="w-full sm:min-w-[10rem] rounded border bg-background px-3 py-2 text-sm appearance-none"
                            >
                                {monthOptions.map((m) => (
                                    <option key={m.value} value={m.value}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1 w-full sm:w-auto min-w-0">
                            <label className="text-xs font-medium text-muted-foreground" htmlFor="year-select">
                                Jahr
                            </label>
                            <select
                                id="year-select"
                                name="year"
                                defaultValue={year}
                                className="w-full sm:min-w-[6rem] rounded border bg-background px-3 py-2 text-sm appearance-none"
                            >
                                {yearOptions.map((y) => (
                                    <option key={y} value={y}>
                                        {y}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1 w-full sm:w-auto min-w-0">
                            <label className="text-xs font-medium text-muted-foreground" htmlFor="period-select">
                                Ansicht
                            </label>
                            <select
                                id="period-select"
                                name="period"
                                defaultValue={period}
                                className="w-full sm:min-w-[12rem] rounded border bg-background px-3 py-2 text-sm appearance-none"
                            >
                                <option value="calendar">Kalendermonat</option>
                                <option value="23-22">Abrechnungszeitraum Cafe</option>
                                <option value="15-14">Abrechnungszeitraum KV</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0">
                            <button
                                type="submit"
                                className="flex-1 sm:flex-none rounded border bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80"
                            >
                                Anzeigen
                            </button>
                            <PrintButton filename={pdfFilename} />
                        </div>
                    </form>
                </div>

                {/* Table Wrapper (Scrollable) - Hidden on mobile, visible on lg screens and in print */}
                <div
                    className="hidden lg:block print:block w-full overflow-x-auto border rounded-md shadow-sm bg-card print:shadow-none print:border-none print:pt-12"
                    style={{ breakBefore: 'page' }}
                >
                    <style>{`@media print { @page { size: portrait; margin: 1cm; } .print-break-before { break-before: page; } }`}</style>
                    {/* Print Header for Second Page (Table Page) */}
                    <div className="hidden print:block text-[11pt] text-muted-foreground border-b-2 pb-2 mb-8">
                        <div className="flex justify-between font-bold">
                            <span>
                                Arbeitszeitnachweis: {selectedUserLabel} (
                                {period === 'calendar' ? monthLabel(year, month) : altPeriodLabel(year, month, period)})
                            </span>
                        </div>
                        <div className="flex justify-between mt-1">
                            <span>Erstellt am: {formattedDate}</span>
                            <span>
                                Erstellt von: {adminLabel} (Admin) für {selectedUserLabel}
                            </span>
                        </div>
                    </div>
                    <table className="w-full table-fixed border-collapse text-[10px] sm:text-xs lg:text-sm min-w-[800px] lg:min-w-full print:min-w-full print:text-[10pt]">
                        <thead>
                            <tr className="bg-muted/50">
                                <th className="border px-1 py-1.5 text-center font-semibold w-[80px] sm:w-[10%] print:py-2 print:border-b-2 print:bg-zinc-100">
                                    Tag
                                </th>
                                <th className="border px-1 py-1.5 text-center font-semibold w-[70px] sm:w-[12%] print:py-2 print:border-b-2 print:bg-zinc-100">
                                    Start
                                </th>
                                <th className="border px-1 py-1.5 text-center font-semibold w-[110px] sm:w-[15%] print:py-2 print:border-b-2 print:bg-zinc-100">
                                    Pausen
                                </th>
                                <th className="border px-1 py-1.5 text-center font-semibold w-[70px] sm:w-[12%] print:py-2 print:border-b-2 print:bg-zinc-100">
                                    Stop
                                </th>
                                <th className="border px-1 py-1.5 text-center font-semibold w-[60px] sm:w-[8%] print:py-2 print:border-b-2 print:bg-zinc-100">
                                    Dauer
                                </th>
                                <th className="border px-1 py-1.5 text-center font-semibold w-[70px] sm:w-[12%] print:py-2 print:border-b-2 print:bg-zinc-100">
                                    Pausen Σ
                                </th>
                                <th className="border px-1 py-1.5 text-center font-semibold w-[60px] sm:w-[8%] print:py-2 print:border-b-2 print:bg-zinc-100">
                                    Netto
                                </th>
                                {selectedContract?.type === 'fixed_salary' && (
                                    <>
                                        <th className="border px-1 py-1.5 text-center font-semibold w-[60px] sm:w-[8%] print:py-2 print:border-b-2 print:bg-zinc-100">
                                            Soll
                                        </th>
                                        <th className="border px-1 py-1.5 text-center font-semibold w-[60px] sm:w-[8%] print:py-2 print:border-b-2 print:bg-zinc-100">
                                            Saldo
                                        </th>
                                    </>
                                )}
                                <th className="border px-1 py-1.5 text-left font-semibold w-[150px] sm:w-[20%] print:py-2 print:border-b-2 print:bg-zinc-100">
                                    Hinweise
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {dayStats.map((s, idx) => {
                                const dayNumber = ((): number => {
                                    if (period === 'calendar') {
                                        return idx + 1;
                                    }
                                    if (period === '23-22') {
                                        // 23..Ende (prev), dann 1..22 (curr)
                                        const daysInPrev = new Date(year, month, 0).getDate();
                                        return idx < daysInPrev - 22 ? 23 + idx : idx - (daysInPrev - 22) + 1;
                                    }
                                    if (period === '15-14') {
                                        // 15..Ende (prev), dann 1..14 (curr)
                                        const daysInPrev = new Date(year, month, 0).getDate();
                                        return idx < daysInPrev - 14 ? 15 + idx : idx - (daysInPrev - 14) + 1;
                                    }
                                    return idx + 1;
                                })();

                                const hasBookingErrors = s.issues.some(
                                    (x) =>
                                        x.includes('Fehlendes Start/Stop') ||
                                        x.includes('Start/Stop-Reihenfolge') ||
                                        x.includes('Unvollständige Pause') ||
                                        x.includes('Pausen-Reihenfolge'),
                                );

                                const noBookings = s.totalEntries === 0 && s.absences.length === 0;

                                const rowClass = hasBookingErrors ? 'bg-red-50' : noBookings ? 'bg-zinc-50 text-zinc-400' : '';

                                const pauseWarnText =
                                    s.breakWarning === 'under45'
                                        ? '< 45 Min (>9h)'
                                        : s.breakWarning === 'under30'
                                          ? '< 30 Min (>6h)'
                                          : null;

                                const hints: Array<{ text: string; className: string }> = [];
                                if (pauseWarnText) {
                                    hints.push({ text: pauseWarnText, className: 'text-red-600' });
                                }

                                // Abwesenheiten zu Hinweisen hinzufügen
                                for (const a of s.absences) {
                                    const typeLabel =
                                        a.absence?.type === 'vacation'
                                            ? 'Urlaub'
                                            : a.absence?.type === 'sick'
                                              ? 'Krankheit'
                                              : a.absence?.type === 'holiday'
                                                ? 'Feiertag'
                                                : a.absence?.type;
                                    hints.push({
                                        text: `${typeLabel} (${a.absence?.hoursValue}h)`,
                                        className: 'font-semibold text-blue-600',
                                    });
                                }

                                for (const issue of s.issues) {
                                    if (issue === 'Keine Buchungen') {
                                        continue;
                                    }
                                    hints.push({ text: issue, className: '' });
                                }

                                const ref = dayRefs[idx];
                                if (!ref) {
                                    // idx is out of range;
                                    return null;
                                }

                                const dYear = ref.source === 'curr' ? year : prevYear;
                                const dMonth = ref.source === 'curr' ? month : prevMonth;

                                const weekday = new Date(dYear, dMonth, dayNumber).toLocaleDateString('de-DE', {
                                    weekday: 'short',
                                    timeZone: 'Europe/Berlin',
                                });

                                return (
                                    <tr key={idx} className={`${rowClass} print:bg-transparent print:border-b`}>
                                        <td className="border px-2 py-1 text-center whitespace-nowrap print:py-2">
                                            {weekday} {dayNumber}
                                        </td>

                                        {/* Startzeiten */}
                                        <td className="border px-2 py-1 text-center print:py-2">
                                            {s.starts.length > 0 ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    {s.starts.map((t: Date, i2: number) => (
                                                        <span key={i2} className={timeToken}>
                                                            {toTimeStr(t)}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </td>

                                        {/* Pausen (keine Hintergründe) */}
                                        <td className="border px-2 py-1 text-center print:py-2">
                                            {s.breakPairs.length > 0 ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    {s.breakPairs.map((p, i3) => (
                                                        <span
                                                            key={`bp-${i3}`}
                                                            className="inline-flex items-center gap-1 text-[10px] sm:text-xs print:text-[10pt]"
                                                        >
                                                            <span className={timeToken}>{toTimeStr(p.from)}</span>
                                                            <span>–</span>
                                                            <span className={timeToken}>{toTimeStr(p.to)}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </td>

                                        {/* Stopzeiten */}
                                        <td className="border px-2 py-1 text-center print:py-2">
                                            {s.stops.length > 0 ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    {s.stops.map((t: Date, i4: number) => (
                                                        <span key={i4} className={timeToken}>
                                                            {toTimeStr(t)}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </td>

                                        {/* Dauer (Brutto) */}
                                        <td className="border px-2 py-1 text-center print:py-2">
                                            {s.sessionMinutes > 0 ? <span className="font-medium">{toHHMM(s.sessionMinutes)}</span> : null}
                                        </td>

                                        {/* Pausen Σ */}
                                        <td className="border px-2 py-1 text-center print:py-2">
                                            {s.adjustedBreakMinutes > 0 || s.actualBreakMinutes > 0 ? (
                                                <span
                                                    className="font-medium"
                                                    title={
                                                        s.requiredBreakMinutes > s.actualBreakMinutes
                                                            ? 'Gesetzliche Mindestpause angewendet'
                                                            : 'Gebuchte Pause = angerechnete Pause'
                                                    }
                                                >
                                                    {toHHMM(s.adjustedBreakMinutes)}
                                                    {s.actualBreakMinutes !== s.adjustedBreakMinutes && (
                                                        <span className="text-muted-foreground text-[10px] block print:text-[9pt] print:text-foreground">
                                                            ({toHHMM(s.actualBreakMinutes)})
                                                        </span>
                                                    )}
                                                </span>
                                            ) : null}
                                        </td>

                                        {/* Arbeitszeit (Netto) */}
                                        <td className="border px-2 py-1 text-center print:py-2">
                                            {s.netMinutes > 0 ? <span className="font-medium">{toHHMM(s.netMinutes)}</span> : null}
                                        </td>

                                        {selectedContract?.type === 'fixed_salary' && (
                                            <>
                                                {/* Soll */}
                                                <td className="border px-2 py-1 text-center print:py-2">
                                                    {s.targetMinutes > 0 ? (
                                                        <span className="text-muted-foreground print:text-foreground">
                                                            {toHHMM(s.targetMinutes)}
                                                        </span>
                                                    ) : null}
                                                </td>

                                                {/* Saldo */}
                                                <td className="border px-2 py-1 text-center print:py-2">
                                                    {s.balanceMinutes !== 0 ? (
                                                        <span className="font-medium">{sumToHHMM(s.balanceMinutes)}</span>
                                                    ) : null}
                                                </td>
                                            </>
                                        )}

                                        {/* Hinweise (links) */}
                                        <td className="border px-2 py-1 text-left overflow-hidden text-ellipsis print:py-2">
                                            {hints.length > 0 ? (
                                                <div className="flex flex-col gap-0.5">
                                                    {hints.map((h: { text: string; className: string }, i5: number) => (
                                                        <span
                                                            key={i5}
                                                            className={`text-[10px] leading-tight print:text-[9pt] ${h.className}`}
                                                        >
                                                            {h.text}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="font-bold bg-muted/30 print:bg-zinc-100 print:border-t-2">
                                <td className="border px-1 py-1.5 text-center print:py-3">Summe</td>
                                <td className="border px-1 py-1.5 print:py-3" />
                                <td className="border px-1 py-1.5 print:py-3" />
                                <td className="border px-1 py-1.5 print:py-3" />
                                <td className="border px-1 py-1.5 text-center print:py-3">{toHHMM(totals.gross)}</td>
                                <td className="border px-1 py-1.5 text-center print:py-3">
                                    {toHHMM(totals.breakAdjusted)}
                                    {totals.breakActual !== totals.breakAdjusted && (
                                        <span className="text-muted-foreground text-[10px] block font-normal print:text-[9pt] print:text-foreground">
                                            ({toHHMM(totals.breakActual)})
                                        </span>
                                    )}
                                </td>
                                <td className="border px-1 py-1.5 text-center print:py-3">{toHHMM(totals.net)}</td>
                                {selectedContract?.type === 'fixed_salary' && (
                                    <>
                                        <td className="border px-1 py-1.5 text-center print:py-3">{toHHMM(totals.target)}</td>
                                        <td className="border px-1 py-1.5 text-center print:py-3">
                                            <span>{sumToHHMM(totals.balance)}</span>
                                        </td>
                                    </>
                                )}
                                <td className="border px-1 py-1.5 print:py-3" />
                            </tr>
                            <tr className="print:hidden">
                                <td colSpan={selectedContract?.type === 'fixed_salary' ? 10 : 8} className="border-t px-3 py-3 text-sm">
                                    {infoBits.length > 0 ? (
                                        <ul className="list-disc space-y-1 pl-5">
                                            {infoBits.map((t: string, i: number) => (
                                                <li key={i}>{t}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <span className="text-muted-foreground text-xs italic">
                                            Hinweis: Schichten, die vor Mitternacht beginnen, werden dem Start-Tag zugeordnet.
                                        </span>
                                    )}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Mobile Info View */}
                <div className="lg:hidden print:hidden bg-blue-50 border-l-4 border-blue-400 p-4 rounded text-blue-700 space-y-2">
                    <p className="font-medium">Die tabellarische Monatsübersicht ist auf Mobilgeräten deaktiviert.</p>
                    <p className="text-sm">Bitte nutze den PDF-Export, um die vollständige Übersicht für diesen Zeitraum zu sehen.</p>
                </div>

                {/* Summary Wrapper */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8 w-full print:hidden">
                    {selectedContract?.type === 'fixed_salary' && (
                        <div className="rounded border bg-card p-3 text-card-foreground shadow-sm break-inside-avoid w-full">
                            <h2 className="text-sm font-semibold mb-2 border-b pb-1">Arbeitszeit & Saldo</h2>
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between border-b pb-0.5 text-muted-foreground">
                                    <span>Wöchentliche Arbeitszeit:</span>
                                    <span className="font-medium text-foreground">{selectedContract.weeklyHours?.toFixed(2)} h</span>
                                </div>
                                <div className="flex justify-between border-b pb-0.5 text-muted-foreground">
                                    <span>GLZ-Übertrag aus Vormonat:</span>
                                    <span className="font-medium text-foreground">{overtimeCarryover.toFixed(2)} h</span>
                                </div>
                                <div className="flex justify-between border-b pb-0.5 text-muted-foreground">
                                    <span>GLZ-Saldo aktueller Zeitraum:</span>
                                    <span className="font-medium text-foreground">
                                        {monthlyBalanceHours >= 0 ? '+' : ''}
                                        {monthlyBalanceHours.toFixed(2)} h
                                    </span>
                                </div>
                                <div className="flex justify-between border-b pb-0.5 text-muted-foreground">
                                    <span>GLZ-Saldo ungekappt:</span>
                                    <span className="font-medium text-foreground">{totalOvertimeUncapped.toFixed(2)} h</span>
                                </div>
                                <div className="flex justify-between pt-0.5 font-bold">
                                    <span>GLZ-Saldo (Summe):</span>
                                    <span>{totalOvertimeCapped.toFixed(2)} h</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedContract?.type === 'fixed_salary' && (
                        <div className="rounded border bg-card p-3 text-card-foreground shadow-sm break-inside-avoid w-full">
                            <h2 className="text-sm font-semibold mb-2 border-b pb-1">Urlaubskonto {year}</h2>
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between border-b pb-0.5 text-muted-foreground">
                                    <span>Jahresanspruch:</span>
                                    <span className="font-medium text-foreground">{vacationEntitlement} Tage</span>
                                </div>
                                <div className="flex justify-between border-b pb-0.5 text-muted-foreground">
                                    <span>Resturlaub Vorjahr:</span>
                                    <span className="font-medium text-foreground">{carryoverDays} Tage</span>
                                </div>
                                <div className="flex justify-between border-b pb-0.5 text-muted-foreground">
                                    <span>Genommen im Zeitraum:</span>
                                    <span className="font-medium text-foreground">{usedVacationDays} Tage</span>
                                </div>
                                <div className="flex justify-between border-b pb-0.5 text-muted-foreground">
                                    <span>Geplant (Zukunft):</span>
                                    <span className="font-medium text-foreground">{plannedVacationDays} Tage</span>
                                </div>
                                <div className="flex justify-between pt-0.5 font-bold">
                                    <span>Verbleibend (Gesamtjahr):</span>
                                    <span>{totalVacationAvailable - usedVacationDays - plannedVacationDays} Tage</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {selectedUserId && selectedContractId && selectedContract?.type === 'hourly' && (
                    <div className="print:hidden">
                        <PayrollHourlyClient
                            contractId={selectedContractId}
                            year={year}
                            month={month}
                            unbilledLogs={unbilledLogs}
                            unbilledDayStats={unbilledDayStats}
                            previousPayroll={previousPayroll}
                            periodMode={period}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
