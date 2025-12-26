import type { HrpEventLogEntry } from '@/db/schema';

export interface Entry {
    id?: string;
    entryType?: string | null; // 'start' | 'stop' | 'pause' | 'pause_end'
    loggedTimestamp?: Date | string | null;
    comment?: string | null;
}

export type DayEntries = Array<Entry>;

export interface DayStats {
    starts: Array<Date>;
    stops: Array<Date>;
    startStopPairs: Array<{ from?: Date; to?: Date }>;
    breakPairs: Array<{ from?: Date; to?: Date }>;
    sessionMinutes: number; // Brutto (Summe Start-Stop)
    actualBreakMinutes: number; // Tatsächliche Pausen
    requiredBreakMinutes: number; // Erforderliche Pausen gem. Schwellen
    adjustedBreakMinutes: number; // max(actual, required)
    netMinutes: number; // Brutto - adjustedBreakMinutes
    totalEntries: number;
    startCount: number;
    stopCount: number;
    breakWarning: 'ok' | 'under30' | 'under45';
    issues: Array<string>;
}

interface TimestampValidationResult {
    success: boolean;
    message?: string;
}

export const isValidTimestamp = (timestamp: string): TimestampValidationResult => {
    if (!timestamp) {
        return { success: false, message: 'Es ist ein Fehler aufgetreten.' };
    }

    const time = new Date(timestamp);
    if (isNaN(time.getTime())) {
        return { success: false, message: 'Ungültiges Zeitstempel-Format' };
    }
    const now = new Date();
    const fourtyFiveMinutesAhead = new Date(now.getTime() + 45 * 60 * 1000);

    if (time > fourtyFiveMinutesAhead) {
        return { success: false, message: 'Der Zeitstempel liegt zu weit in der Zukunft' };
    }

    return { success: true };
};

export const minutesBetween = (a?: Date, b?: Date): number => {
    if (!a || !b) {
        return 0;
    }
    const diff = Math.abs(b.getTime() - a.getTime());
    return Math.round(diff / (1000 * 60));
};

export const requiredBreakForNet = (netMinutes: number): number => {
    if (netMinutes > 9 * 60) {
        return 45;
    }
    if (netMinutes > 6 * 60) {
        return 30;
    }
    return 0;
};

export const toTimeStr = (d: Date | null | undefined): string => {
    if (!d || isNaN(d.getTime?.() ?? NaN)) {
        return '–';
    }
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
};

export const emptyStats = (): DayStats => {
    return {
        starts: [],
        stops: [],
        startStopPairs: [],
        breakPairs: [],
        sessionMinutes: 0,
        actualBreakMinutes: 0,
        requiredBreakMinutes: 0,
        adjustedBreakMinutes: 0,
        netMinutes: 0,
        totalEntries: 0,
        startCount: 0,
        stopCount: 0,
        breakWarning: 'ok',
        issues: [],
    };
};

export const computeDayStats = (entries: DayEntries): DayStats => {
    if (!entries || entries.length === 0) {
        const es = emptyStats();
        es.issues.push('Keine Buchungen');
        return es;
    }

    const byTime = [...entries]
        .map((e) => ({ ...e, ts: e.loggedTimestamp ? new Date(String(e.loggedTimestamp)) : undefined }))
        .filter((e) => e.ts && !isNaN(e.ts.getTime()))
        .sort((a, b) => a.ts!.getTime() - b.ts!.getTime()) as Array<Entry & { ts: Date }>;

    const starts: Array<Date> = [];
    const stops: Array<Date> = [];
    const pauseStarts: Array<Date> = [];
    const pauseEnds: Array<Date> = [];

    for (const e of byTime) {
        const t = (e.entryType ?? '').toLowerCase();
        if (t === 'start') {
            starts.push(e.ts);
        } else if (t === 'stop') {
            stops.push(e.ts);
        } else if (t === 'pause') {
            pauseStarts.push(e.ts);
        } else if (t === 'pause_end') {
            pauseEnds.push(e.ts);
        }
    }

    const issues: Array<string> = [];

    // Sessions
    let sessionMinutes = 0;
    const startStopPairs: Array<{ from?: Date; to?: Date }> = [];
    const sessionPairCount = Math.min(starts.length, stops.length);
    for (let i = 0; i < sessionPairCount; i++) {
        const from = starts[i];
        const to = stops[i];
        startStopPairs.push({ from, to });
        if (from && to && to > from) {
            sessionMinutes += minutesBetween(from, to);
        } else {
            issues.push('Start/Stop-Reihenfolge fehlerhaft');
        }
    }
    if (starts.length !== stops.length) {
        issues.push('Fehlendes Start/Stop');
    }

    // Breaks
    let actualBreakMinutes = 0;
    const breakPairs: Array<{ from?: Date; to?: Date }> = [];
    const breakPairCount = Math.min(pauseStarts.length, pauseEnds.length);
    for (let i = 0; i < breakPairCount; i++) {
        const from = pauseStarts[i];
        const to = pauseEnds[i];
        breakPairs.push({ from, to });
        if (from && to && to > from) {
            actualBreakMinutes += minutesBetween(from, to);
        } else {
            issues.push('Pausen-Reihenfolge fehlerhaft');
        }
    }
    if (pauseStarts.length !== pauseEnds.length) {
        issues.push('Unvollständige Pause');
    }

    // Netto-Kandidat, Pflichtpause, Anpassung
    const netCandidate = Math.max(0, sessionMinutes - actualBreakMinutes);
    const requiredMinutes = requiredBreakForNet(netCandidate);
    const adjustedBreakMinutes = Math.max(actualBreakMinutes, requiredMinutes);
    const netMinutes = Math.max(0, sessionMinutes - adjustedBreakMinutes);

    // Warnung
    let breakWarning: 'ok' | 'under30' | 'under45' = 'ok';
    if (requiredMinutes === 45 && actualBreakMinutes < 45) {
        breakWarning = 'under45';
    } else if (requiredMinutes === 30 && actualBreakMinutes < 30) {
        breakWarning = 'under30';
    }

    return {
        starts,
        stops,
        startStopPairs,
        breakPairs,
        sessionMinutes,
        actualBreakMinutes,
        requiredBreakMinutes: requiredMinutes,
        adjustedBreakMinutes,
        netMinutes,
        totalEntries: entries.length,
        startCount: starts.length,
        stopCount: stops.length,
        breakWarning,
        issues,
    };
};

export interface BreakValidationResult {
    isValid: boolean;
    requiredMinutes: number;
    actualMinutes: number;
    warning?: string;
}

/**
 * Gruppiert Einträge nach dem logischen Arbeitstag.
 * Ein Arbeitstag beginnt mit einem 'start'-Event. Alle folgenden Events bis zum nächsten 'stop'
 * gehören zu diesem Tag, auch wenn sie nach Mitternacht stattfinden.
 * Wenn ein Event außerhalb einer Start-Stop-Klammer liegt, wird sein Kalendertag verwendet.
 */
export function groupEntriesByWorkday<T extends Entry>(entries: Array<T>): Record<string, Array<T>> {
    const sorted = [...entries]
        .map((e) => ({ ...e, ts: e.loggedTimestamp ? new Date(e.loggedTimestamp) : undefined }))
        .filter((e) => e.ts && !isNaN(e.ts.getTime()))
        .sort((a, b) => a.ts!.getTime() - b.ts!.getTime()) as Array<T & { ts: Date }>;

    const groups: Record<string, Array<T>> = {};

    let currentWorkday: string | null = null;

    for (const entry of sorted) {
        const type = (entry.entryType ?? '').toLowerCase();
        // Verwende Europe/Berlin für die Bestimmung des Kalendertages
        const calendarDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(entry.ts);

        if (type === 'start') {
            currentWorkday = calendarDay;
        }

        const assignedDay = currentWorkday ?? calendarDay;
        if (!groups[assignedDay]) {
            groups[assignedDay] = [];
        }
        groups[assignedDay].push(entry);

        if (type === 'stop') {
            currentWorkday = null;
        }
    }

    return groups;
}

/**
 * Safely converts loggedTimestamp to Date object
 */
const toDate = (timestamp: Date | string | null | undefined): Date | null => {
    if (!timestamp) {
        return null;
    }
    if (timestamp instanceof Date) {
        return timestamp;
    }
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
};

export function validateBreaks(
    existingEntries: Array<Partial<HrpEventLogEntry>>,
    newEntry: { entryType: string; timestamp: Date },
): BreakValidationResult {
    if (newEntry.entryType.toLowerCase() !== 'stop') {
        return { isValid: true, requiredMinutes: 0, actualMinutes: 0 };
    }

    // Kombiniere vorhandene Einträge mit dem neuen Eintrag
    const newEntryObj: Entry = { entryType: newEntry.entryType, loggedTimestamp: newEntry.timestamp };
    const allEntries: DayEntries = [...existingEntries, newEntryObj];

    const groups = groupEntriesByWorkday(allEntries);
    let relevantEntries: DayEntries = [];
    const newEntryTime = newEntry.timestamp.getTime();

    for (const groupEntries of Object.values(groups)) {
        if (
            groupEntries.some((e) => {
                if (e.entryType !== newEntry.entryType) {
                    return false;
                }
                const entryDate = toDate(e.loggedTimestamp);
                return entryDate !== null && entryDate.getTime() === newEntryTime;
            })
        ) {
            relevantEntries = groupEntries;
            break;
        }
    }

    const stats = computeDayStats(relevantEntries);

    if (stats.breakWarning !== 'ok') {
        return {
            isValid: false,
            requiredMinutes: stats.requiredBreakMinutes,
            actualMinutes: stats.actualBreakMinutes,
            warning: `Pausenzeiten unterschritten: Erforderlich ${stats.requiredBreakMinutes} Min, Aktuell ${stats.actualBreakMinutes} Min.`,
        };
    }

    return {
        isValid: true,
        requiredMinutes: stats.requiredBreakMinutes,
        actualMinutes: stats.actualBreakMinutes,
    };
}
