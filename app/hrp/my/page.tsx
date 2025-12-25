import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import NavbarTop from '@/components/sidebar/NavbarTop';
import { db } from '@/db';
import { usersTable } from '@/db/schema';
import getUserSession from '@/lib/auth/getUserSession';
import { getHrpLogForUser } from '@/lib/db/hrpActions';
import type { DayEntries } from '@/lib/hrp/hrpLogic';
import { computeDayStats, toTimeStr } from '@/lib/hrp/hrpLogic';

const breadCrumbs = [
    { title: 'Zeiterfassung', url: '/hrp' },
    { title: 'Abrechnungsübersicht', active: true },
];

export const metadata: Metadata = {
    description: 'Arbeitszeiterfassung im internen Portal der B-Side',
    robots: 'noindex, nofollow',
};

type PeriodMode = 'calendar' | '23-22';

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
    const rawPeriod = Array.isArray(searchParams?.period) ? searchParams?.period[0] : searchParams?.period;

    const year = Number.isFinite(Number(rawYear)) ? Number(rawYear) : now.getFullYear();
    const mCandidate = Number(rawMonth);
    const month = Number.isFinite(mCandidate) && mCandidate >= 1 && mCandidate <= 12 ? mCandidate - 1 : now.getMonth();
    const period: PeriodMode = rawPeriod === '23-22' ? '23-22' : 'calendar';

    return { year, month, period };
};

const monthLabel = (year: number, monthZeroBased: number) =>
    cap(
        new Date(year, monthZeroBased, 1).toLocaleDateString('de-DE', {
            month: 'long',
            year: 'numeric',
        }),
    );

const altPeriodLabel = (year: number, monthZeroBased: number): string => {
    const prevEdge = new Date(year, monthZeroBased, 0); // letzter Tag Vormonat
    const prevY = prevEdge.getFullYear();
    const prevM = prevEdge.getMonth();
    const prevMonthName = cap(new Date(prevY, prevM, 1).toLocaleDateString('de-DE', { month: 'long', timeZone: 'Europe/Berlin' }));
    const currMonthName = cap(
        new Date(year, monthZeroBased, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' }),
    );
    return `23. ${prevMonthName} – 22. ${currMonthName}`;
};

const sumToHHMM = (totalMinutes: number): string => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

function buildDayArray<T>(count: number, map: (indexZero: number) => T): Array<T> {
    return Array.from({ length: count }, (_, i) => map(i));
}

const getUserLabel = (u: { username: string; displayName: string | null }): string => {
    return u.displayName?.trim() || u.username;
};

export default async function Page({
    searchParams,
}: {
    searchParams?: Promise<Record<string, string | Array<string> | undefined>>;
}): Promise<ReactElement> {
    const sp = (await searchParams) ?? {};
    const { year, month, period } = parseFromObject(sp);

    // Only use current authenticated user
    const session = await getUserSession();
    const currentUserId = session?.id;

    if (!currentUserId) {
        // Optionally redirect to login or show a simple message
        return (
            <div>
                <NavbarTop items={breadCrumbs} sidebar={true} />
                <div className="p-6">Bitte melde dich an, um deine Arbeitszeiterfassung zu sehen.</div>
            </div>
        );
    }

    // Fetch current user's name/display label
    const userRow = await db
        .select({ username: usersTable.username, displayName: usersTable.displayName })
        .from(usersTable)
        .where(eq(usersTable.id, currentUserId))
        .limit(1);

    const selectedUserLabel = getUserLabel({
        username: userRow[0]?.username ?? 'Nutzer',
        displayName: userRow[0]?.displayName ?? null,
    });

    // Fetch logs only for the current user
    const logsCurrent = await getHrpLogForUser(currentUserId, year, month);

    // For 23–22 period also load previous month
    const prevEdge = new Date(year, month, 0);
    const prevYear = prevEdge.getFullYear();
    const prevMonth = prevEdge.getMonth();
    const logsPrev = period === '23-22' ? await getHrpLogForUser(currentUserId, prevYear, prevMonth) : undefined;

    // Determine day range for the selected view
    interface DayRef {
        source: 'curr' | 'prev';
        day: number;
    }

    let dayRefs: Array<DayRef> = [];
    if (period === 'calendar') {
        const dim = getDaysInMonth(year, month);
        dayRefs = buildDayArray(dim, (i) => ({ source: 'curr', day: i + 1 }));
    } else {
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
    }

    // Calculate daily stats
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date());

    const dayStats = dayRefs.map((ref) => {
        const dYear = ref.source === 'curr' ? year : prevYear;
        const dMonth = ref.source === 'curr' ? month : prevMonth;
        const entries =
            ref.source === 'prev' ? ((logsPrev?.[ref.day] ?? []) as DayEntries) : ((logsCurrent?.[ref.day] ?? []) as DayEntries);

        const stats = computeDayStats(entries);

        // Check if this ref represents "today"
        const refDate = new Date(dYear, dMonth, ref.day);
        const refDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(refDate);
        const isToday = refDateStr === todayStr;

        // If today and no stop event yet, suppress warnings/issues
        if (isToday && stats.stops.length === 0) {
            return {
                ...stats,
                breakWarning: 'ok' as const,
                issues: stats.issues.filter(
                    (i) =>
                        !i.includes('Fehlendes Start/Stop') &&
                        !i.includes('Pausen-Reihenfolge') &&
                        !i.includes('Unvollständige Pause') &&
                        !i.includes('Start/Stop-Reihenfolge'),
                ),
            };
        }

        return stats;
    });

    // Period totals
    const totals = dayStats.reduce(
        (acc, s) => {
            acc.gross += s.sessionMinutes;
            acc.breakActual += s.actualBreakMinutes;
            acc.breakAdjusted += s.adjustedBreakMinutes;
            acc.net += s.netMinutes;
            return acc;
        },
        { gross: 0, breakActual: 0, breakAdjusted: 0, net: 0 },
    );

    // Style helpers
    const colMax = 'max-w-48';
    const timeToken = 'inline-flex font-medium items-center justify-center w-[5ch] sm:w-[5.5ch] lg:w-[6ch]';

    // Month options for UI
    const monthOptions = Array.from({ length: 12 }, (_, i) => {
        const label = new Date(year, i, 1).toLocaleDateString('de-DE', { month: 'long' });
        return { value: i + 1, label: cap(label) };
    });

    // Aggregated info
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
        if (s.issues.some((x) => x.includes('Fehlendes Start/Stop') || x.includes('Start/Stop-Reihenfolge'))) {
            info.daysUnmatchedSessions.push(d);
        }
        if (s.issues.some((x) => x.includes('Unvollständige Pause') || x.includes('Pausen-Reihenfolge'))) {
            info.daysUnmatchedBreaks.push(d);
        }
        if (s.issues.includes('Keine Buchungen')) {
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

    return (
        <div>
            <NavbarTop items={breadCrumbs} sidebar={true} />

            <div className="space-y-4 p-4 sm:p-6">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold leading-tight">Arbeitszeiterfassung: {selectedUserLabel}</h1>
                    <div className="text-base sm:text-lg text-muted-foreground">
                        {period === 'calendar' ? monthLabel(year, month) : altPeriodLabel(year, month)}
                    </div>
                </div>

                {/* Filter: only month and period (no user selection) */}
                <form className="flex flex-wrap items-center gap-3 print:hidden" method="get">
                    <label className="text-sm font-medium" htmlFor="month-select">
                        Monat:
                    </label>
                    <select
                        id="month-select"
                        name="month"
                        defaultValue={month + 1}
                        className="min-w-[10rem] rounded border bg-background px-3 py-2 text-sm"
                    >
                        {monthOptions.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.label}
                            </option>
                        ))}
                    </select>

                    <label className="text-sm font-medium" htmlFor="period-select">
                        Ansicht:
                    </label>
                    <select
                        id="period-select"
                        name="period"
                        defaultValue={period}
                        className="min-w-[12rem] rounded border bg-background px-3 py-2 text-sm"
                    >
                        <option value="calendar">Kalendermonat</option>
                        <option value="23-22">Abrechnungszeitraum</option>
                    </select>

                    <input type="hidden" name="year" value={year} />
                    <button type="submit" className="rounded border px-3 py-2 text-sm hover:bg-muted">
                        Anzeigen
                    </button>
                </form>

                <div className="max-w-full overflow-x-auto">
                    <table className="w-auto table-auto border-collapse text-xs sm:text-sm print:w-full">
                        <thead>
                            <tr>
                                <th className={`px-2 py-1.5 sm:px-3 sm:py-2 text-center font-semibold ${colMax}`}>Tag</th>
                                <th className={`border-l px-2 py-1.5 sm:px-3 sm:py-2 text-center font-semibold ${colMax}`}>Start</th>
                                <th className={`border-l px-2 py-1.5 sm:px-3 sm:py-2 text-center font-semibold ${colMax}`}>Pausen</th>
                                <th className={`border-l px-2 py-1.5 sm:px-3 sm:py-2 text-center font-semibold ${colMax}`}>Stop</th>
                                <th className={`border-l px-2 py-1.5 sm:px-3 sm:py-2 text-center font-semibold ${colMax}`}>Dauer</th>
                                <th className={`border-l px-2 py-1.5 sm:px-3 sm:py-2 text-center font-semibold ${colMax}`}>Pausen Σ</th>
                                <th className={`border-l px-2 py-1.5 sm:px-3 sm:py-2 text-center font-semibold ${colMax}`}>Arbeitszeit</th>
                                <th className="border-l px-2 py-1.5 sm:px-3 sm:py-2 text-left font-semibold max-w-96">Hinweise</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dayStats.map((s, idx) => {
                                const dayNumber = ((): number => {
                                    if (period === 'calendar') {
                                        return idx + 1;
                                    }
                                    // 23..Ende (prev), dann 1..22 (curr)
                                    const daysInPrev = new Date(year, month, 0).getDate();
                                    return idx < daysInPrev - 22 ? 23 + idx : idx - (daysInPrev - 22) + 1;
                                })();

                                const hasBookingErrors = s.issues.some(
                                    (x) =>
                                        x.includes('Fehlendes Start/Stop') ||
                                        x.includes('Start/Stop-Reihenfolge') ||
                                        x.includes('Unvollständige Pause') ||
                                        x.includes('Pausen-Reihenfolge'),
                                );

                                const noBookings = s.totalEntries === 0;

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
                                for (const issue of s.issues) {
                                    if (issue === 'Keine Buchungen') {
                                        continue;
                                    }
                                    hints.push({ text: issue, className: '' });
                                }

                                return (
                                    <tr key={idx} className={rowClass}>
                                        <td className={`px-2 py-1.5 sm:px-3 sm:py-2 text-center ${colMax}`}>{dayNumber}</td>

                                        {/* Startzeiten */}
                                        <td className={`border-l px-2 py-1.5 sm:px-3 sm:py-2 text-center ${colMax}`}>
                                            {s.starts.length > 0 ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    {s.starts.map((t, i2) => (
                                                        <span key={i2} className={timeToken}>
                                                            {toTimeStr(t)}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </td>

                                        {/* Pausen (keine Hintergründe) */}
                                        <td className={`border-l px-2 py-1.5 sm:px-3 sm:py-2 text-center ${colMax}`}>
                                            {s.breakPairs.length > 0 ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    {s.breakPairs.map((p, i3) => (
                                                        <span key={`bp-${i3}`} className="inline-flex items-center gap-1">
                                                            <span className={timeToken}>{toTimeStr(p.from)}</span>
                                                            <span>–</span>
                                                            <span className={timeToken}>{toTimeStr(p.to)}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </td>

                                        {/* Stopzeiten */}
                                        <td className={`border-l px-2 py-1.5 sm:px-3 sm:py-2 text-center ${colMax}`}>
                                            {s.stops.length > 0 ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    {s.stops.map((t, i4) => (
                                                        <span key={i4} className={timeToken}>
                                                            {toTimeStr(t)}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </td>

                                        {/* Dauer (Brutto) */}
                                        <td className={`border-l px-2 py-1.5 sm:px-3 sm:py-2 text-center ${colMax}`}>
                                            {s.sessionMinutes > 0 ? (
                                                <span className="font-medium">{sumToHHMM(s.sessionMinutes)}</span>
                                            ) : null}
                                        </td>

                                        {/* Pausen Σ */}
                                        <td className={`border-l px-2 py-1.5 sm:px-3 sm:py-2 text-center ${colMax}`}>
                                            {s.adjustedBreakMinutes > 0 || s.actualBreakMinutes > 0 ? (
                                                <span
                                                    className="font-medium"
                                                    title={
                                                        s.requiredBreakMinutes > s.actualBreakMinutes
                                                            ? 'Gesetzliche Mindestpause angewendet'
                                                            : 'Gebuchte Pause = angerechnete Pause'
                                                    }
                                                >
                                                    {sumToHHMM(s.adjustedBreakMinutes)}
                                                    {s.actualBreakMinutes !== s.adjustedBreakMinutes && (
                                                        <span className="text-muted-foreground">
                                                            {' '}
                                                            (gebucht: {sumToHHMM(s.actualBreakMinutes)})
                                                        </span>
                                                    )}
                                                </span>
                                            ) : null}
                                        </td>

                                        {/* Arbeitszeit (Netto) */}
                                        <td className={`border-l px-2 py-1.5 sm:px-3 sm:py-2 text-center ${colMax}`}>
                                            {s.netMinutes > 0 ? <span className="font-medium">{sumToHHMM(s.netMinutes)}</span> : null}
                                        </td>

                                        {/* Hinweise (links) */}
                                        <td className="border-l px-2 py-1.5 sm:px-3 sm:py-2 text-left max-w-96">
                                            {hints.length > 0 ? (
                                                <div className="flex flex-col gap-1">
                                                    {hints.map((h, i5) => (
                                                        <span key={i5} className={`text-xs ${h.className}`}>
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
                            <tr className="font-medium">
                                <td className={`px-2 py-1.5 sm:px-3 sm:py-2 text-center ${colMax}`}>Summe</td>
                                <td className={`border-l px-2 py-1.5 sm:px-3 sm:py-2 text-center ${colMax}`} />
                                <td className={`border-l px-2 py-1.5 sm:px-3 sm:py-2 text-center ${colMax}`} />
                                <td className={`border-l px-2 py-1.5 sm:px-3 sm:py-2 text-center ${colMax}`} />
                                <td className={`border-l px-2 py-1.5 sm:px-3 sm:py-2 text-center ${colMax}`}>{sumToHHMM(totals.gross)}</td>
                                <td className={`border-l px-2 py-1.5 sm:px-3 sm:py-2 text-center ${colMax}`}>
                                    {sumToHHMM(totals.breakAdjusted)}
                                    {totals.breakActual !== totals.breakAdjusted && (
                                        <span className="text-muted-foreground"> (gebucht: {sumToHHMM(totals.breakActual)})</span>
                                    )}
                                </td>
                                <td className={`border-l px-2 py-1.5 sm:px-3 sm:py-2 text-center ${colMax}`}>{sumToHHMM(totals.net)}</td>
                                <td className={`border-l px-2 py-1.5 sm:px-3 sm:py-2 text-left ${colMax}`} />
                            </tr>
                            <tr className="print:hidden">
                                <td colSpan={8} className="border-t px-3 py-3 text-sm">
                                    {infoBits.length > 0 ? (
                                        <ul className="list-disc space-y-1 pl-5">
                                            {infoBits.map((t, i) => (
                                                <li key={i}>{t}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Hinweis: Schichten, die vor Mitternacht beginnen, werden dem Start-Tag zugeordnet.
                                        </span>
                                    )}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
