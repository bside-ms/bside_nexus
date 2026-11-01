import type { DayPreview } from '@/lib/db/hrpCorrectionActions';
import type { PeriodDayEntry } from '@/lib/hrp/period-calculation';
import { format } from 'date-fns';

export interface EditableContract {
    id: string;
    label: string;
    validFrom: string; // YYYY-MM-DD (Berlin)
    validTo: string | null;
}

export interface CorrectionEntry {
    id: string;
    entryType: string;
    // ISO
    timestamp: string;
    comment: string | null;
    contractId: string | null;
    isBilled: boolean;
}

export interface CorrectionAbsence {
    id: string;
    type: string;
    date: string; // YYYY-MM-DD
    hoursValue: string;
    contractId: string | null;
    isBilled: boolean;
}

export const ENTRY_TYPE_OPTIONS = [
    { value: 'start', label: 'Kommen' },
    { value: 'pause', label: 'Pause' },
    { value: 'pause_end', label: 'Pause: Ende' },
    { value: 'stop', label: 'Gehen' },
] as const;

export const ABSENCE_TYPE_OPTIONS = [
    { value: 'vacation', label: 'Urlaub' },
    { value: 'sick', label: 'Krankheit (ohne Attest)' },
    { value: 'sick_with', label: 'Krankheit (mit Attest)' },
    { value: 'compensatory_day', label: 'Ausgleichstag' },
] as const;

export const getEntryTypeLabel = (type: string): string => ENTRY_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;

export const getAbsenceTypeLabel = (type: string): string =>
    type === 'holiday' ? 'Feiertag' : (ABSENCE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type);

// Kennzeichnung im Kommentar, siehe lib/hrp/corrections.ts
export const CORRECTION_MARKER = '[Korrektur:';

export const formatBerlinDateTime = (iso: string): string =>
    new Intl.DateTimeFormat('de-DE', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Berlin',
    }).format(new Date(iso));

// datetime-local nutzt die Zeitzone des Browsers.
// Wir gehen von Berlin aus.
export const toLocalInputValue = (date: Date): string => format(date, "yyyy-MM-dd'T'HH:mm");

export const formatMinutes = (minutes: number): string => {
    const sign = minutes < 0 ? '-' : '';
    const abs = Math.abs(minutes);
    return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')} h`;
};

export const getContractsValidAt = (contracts: Array<EditableContract>, day: string): Array<EditableContract> =>
    contracts.filter((c) => c.validFrom <= day && (c.validTo === null || c.validTo >= day));

export interface AdminApiResult {
    success: boolean;
    message?: string;
    preview?: Array<DayPreview>;
    count?: number;
}

export const callAdminApi = async (url: string, method: 'POST' | 'PATCH' | 'DELETE', body: object): Promise<AdminApiResult> => {
    try {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = (await res.json()) as AdminApiResult & { issues?: Array<{ message: string }> };
        if (!res.ok || !data.success) {
            return { success: false, message: data.issues?.[0]?.message ?? data.message ?? 'Es ist ein Fehler aufgetreten.' };
        }
        return data;
    } catch {
        return { success: false, message: 'Die Anfrage ist fehlgeschlagen. Bitte versuche es erneut.' };
    }
};

/** Teilt die Einträge eines Arbeitstags in Buchungen und Abwesenheiten. */
export const toCorrectionData = (
    entries: Array<PeriodDayEntry>,
): { bookings: Array<CorrectionEntry>; absences: Array<CorrectionAbsence> } => {
    const bookings: Array<CorrectionEntry> = [];
    const absences: Array<CorrectionAbsence> = [];
    for (const e of entries) {
        if (e.entryType === 'absence') {
            if (e.absence !== undefined) {
                absences.push({
                    id: e.absence.id,
                    type: e.absence.type,
                    date: e.absence.date,
                    hoursValue: e.absence.hoursValue,
                    contractId: e.absence.contractId,
                    isBilled: e.absence.abgerechnet_date !== null,
                });
            }
            continue;
        }
        if (e.id === undefined || e.loggedTimestamp === undefined || e.loggedTimestamp === null) {
            continue;
        }
        bookings.push({
            id: e.id,
            entryType: e.entryType ?? '',
            timestamp: new Date(e.loggedTimestamp).toISOString(),
            comment: e.comment ?? null,
            contractId: e.contractId ?? null,
            isBilled: e.abgerechnet === true || (e.abgerechnet_date !== undefined && e.abgerechnet_date !== null),
        });
    }
    return { bookings, absences };
};
