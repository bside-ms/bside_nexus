import type { SickAbsenceRow, SickListGroup } from '@/lib/db/hrpSickListActions';
import { getPublicHolidayDates, getSickAbsences, getSickListGroups } from '@/lib/db/hrpSickListActions';
import type { KeycloakNameParts } from '@/lib/keycloak/userActions';
import { keycloakGetNameParts } from '@/lib/keycloak/userActions';
import isNotEmptyString from '@/lib/utils/isNotEmptyString';

export const SICK_LIST_PERIOD_MODES = ['15-14', 'calendar', '23-22'] as const;
export type SickListPeriodMode = (typeof SICK_LIST_PERIOD_MODES)[number];

export const SICK_LIST_PERIOD_LABELS: Record<SickListPeriodMode, string> = {
    '15-14': '15. bis 14. (Kulturverein)',
    calendar: 'Kalendermonat',
    '23-22': '23. bis 22. (Café)',
};

export type SickListCertificate = 'yes' | 'no' | 'partly';

export const SICK_LIST_CERTIFICATE_LABELS: Record<SickListCertificate, string> = {
    yes: 'mit Attest',
    no: 'ohne Attest',
    partly: 'teilweise',
};

export interface SickListQuery {
    year: number;
    // 1–12, null means the whole year
    month: number | null;
    mode: SickListPeriodMode;
    // null means all groups the user may see
    groupId: string | null;
}

export interface SickListPeriod {
    year: number;
    month: number;
    from: string;
    to: string;
    label: string;
}

export interface SickListEntry {
    userId: string;
    firstName: string;
    lastName: string;
    groupName: string;
    from: string;
    to: string;
    workdays: number;
    hours: number;
    holidays: number;
    certificate: SickListCertificate;
    // Set when the illness began before or goes on after the period
    illnessStart: string | null;
    illnessEnd: string | null;
}

export interface SickListSection {
    period: SickListPeriod;
    entries: Array<SickListEntry>;
    totalHours: number;
}

export interface SickList {
    query: SickListQuery;
    groups: Array<SickListGroup>;
    sections: Array<SickListSection>;
}

interface SickDay {
    date: string;
    hours: number;
    withCertificate: boolean;
}

interface Episode {
    userId: string;
    userName: string | null;
    groupId: string;
    days: Array<SickDay>;
}

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];
// Wide enough to find the start and end of long illnesses around the selected periods.
const LOOK_AROUND_DAYS = 366;

const parseIsoDate = (value: string): Date => new Date(`${value}T00:00:00Z`);
const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);
const utcIsoDate = (year: number, monthIndex: number, day: number): string => toIsoDate(new Date(Date.UTC(year, monthIndex, day)));

const addDays = (value: string, days: number): string => {
    const date = parseIsoDate(value);
    date.setUTCDate(date.getUTCDate() + days);
    return toIsoDate(date);
};

export const formatGermanDate = (value: string): string => `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)}`;

export const formatHours = (hours: number): string =>
    hours.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });

const roundHours = (hours: number): number => Math.round(hours * 100) / 100;

export const getSickListPeriod = (year: number, month: number, mode: SickListPeriodMode): SickListPeriod => {
    const label = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(Date.UTC(year, month - 1, 1)),
    );

    if (mode === 'calendar') {
        return { year, month, from: utcIsoDate(year, month - 1, 1), to: utcIsoDate(year, month, 0), label };
    }

    // The period is named after the month it ends in, as in the payroll overview.
    const startDay = mode === '15-14' ? 15 : 23;
    return { year, month, from: utcIsoDate(year, month - 2, startDay), to: utcIsoDate(year, month - 1, startDay - 1), label };
};

type ParamReader = (key: string) => string | undefined;

export const parseSickListQuery = (read: ParamReader, today: string): SickListQuery => {
    const year = Number(read('year'));
    const rawMonth = read('month');
    const month = Number(rawMonth);
    const rawGroup = read('group');

    return {
        year: Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : Number(today.slice(0, 4)),
        month: rawMonth === 'all' ? null : Number.isInteger(month) && month >= 1 && month <= 12 ? month : Number(today.slice(5, 7)),
        mode: SICK_LIST_PERIOD_MODES.find((mode) => mode === read('period')) ?? '15-14',
        groupId: isNotEmptyString(rawGroup) && rawGroup !== 'all' ? rawGroup : null,
    };
};

export const toSickListSearchParams = (query: SickListQuery): string =>
    new URLSearchParams({
        year: String(query.year),
        month: query.month === null ? 'all' : String(query.month),
        period: query.mode,
        group: query.groupId ?? 'all',
    }).toString();

export const getSickListFileName = (query: SickListQuery): string =>
    `Krankheitsliste_${query.year}${query.month === null ? '' : `-${String(query.month).padStart(2, '0')}`}_${query.mode}.csv`;

const isWorkday = (date: string, workingDays: Array<number> | null, holidays: Set<string>): boolean => {
    if (holidays.has(date)) {
        return false;
    }
    const weekday = parseIsoDate(date).getUTCDay();
    const days = workingDays !== null && workingDays.length > 0 ? workingDays : DEFAULT_WORKING_DAYS;
    return days.includes(weekday === 0 ? 7 : weekday);
};

// Sick days belong to one illness if only non-working days or public holidays lie between them.
const isContinuation = (previous: string, next: string, workingDays: Array<number> | null, holidays: Set<string>): boolean => {
    for (let day = addDays(previous, 1); day < next; day = addDays(day, 1)) {
        if (isWorkday(day, workingDays, holidays)) {
            return false;
        }
    }
    return true;
};

// Groups per person and employer, so a contract change during an illness does not split it.
const buildEpisodes = (rows: Array<SickAbsenceRow>, holidays: Set<string>): Array<Episode> => {
    const rowsByPerson = new Map<string, Array<SickAbsenceRow>>();
    for (const row of rows) {
        const key = `${row.userId}|${row.employerGroupId}`;
        const personRows = rowsByPerson.get(key);
        if (personRows === undefined) {
            rowsByPerson.set(key, [row]);
        } else {
            personRows.push(row);
        }
    }

    const episodes: Array<Episode> = [];
    // The rows arrive ordered by date.
    for (const personRows of rowsByPerson.values()) {
        let current: Episode | null = null;
        let previousRow: SickAbsenceRow | null = null;

        for (const row of personRows) {
            const hours = Number(row.hoursValue);
            const withCertificate = row.type === 'sick_with';
            const lastDay = current?.days.at(-1);

            if (current !== null && lastDay?.date === row.date) {
                // Two contracts of the same person and employer on one day
                lastDay.hours += hours;
                lastDay.withCertificate ||= withCertificate;
            } else if (
                current !== null &&
                lastDay !== undefined &&
                previousRow !== null &&
                isContinuation(lastDay.date, row.date, previousRow.workingDays, holidays)
            ) {
                current.days.push({ date: row.date, hours, withCertificate });
            } else {
                current = {
                    userId: row.userId,
                    userName: row.userName,
                    groupId: row.employerGroupId,
                    days: [{ date: row.date, hours, withCertificate }],
                };
                episodes.push(current);
            }
            previousRow = row;
        }
    }
    return episodes;
};

const splitDisplayName = (displayName: string): KeycloakNameParts => {
    const trimmed = displayName.trim();
    const index = trimmed.lastIndexOf(' ');
    return index === -1 ? { firstName: '', lastName: trimmed } : { firstName: trimmed.slice(0, index), lastName: trimmed.slice(index + 1) };
};

const resolveName = (keycloakName: KeycloakNameParts | undefined, displayName: string | null): KeycloakNameParts => {
    const lastName = keycloakName?.lastName ?? '';
    if (keycloakName !== undefined && lastName !== '' && lastName !== '.') {
        // A display name change in Nexus writes the full name into firstName.
        const suffix = ` ${lastName}`;
        const { firstName } = keycloakName;
        return { firstName: firstName.endsWith(suffix) ? firstName.slice(0, -suffix.length) : firstName, lastName };
    }
    return splitDisplayName(displayName ?? keycloakName?.firstName ?? '');
};

const loadNames = async (userIds: Array<string>): Promise<Map<string, KeycloakNameParts>> => {
    if (userIds.length === 0) {
        return new Map();
    }
    try {
        return await keycloakGetNameParts(userIds);
    } catch {
        // Without Keycloak the display name is split instead.
        return new Map();
    }
};

const getCertificate = (days: Array<SickDay>): SickListCertificate => {
    const withCertificate = days.filter((day) => day.withCertificate).length;
    return withCertificate === days.length ? 'yes' : withCertificate === 0 ? 'no' : 'partly';
};

const getUserIdsInPeriods = (rows: Array<SickAbsenceRow>, periods: Array<SickListPeriod>): Array<string> => [
    ...new Set(rows.filter((row) => periods.some((period) => row.date >= period.from && row.date <= period.to)).map((row) => row.userId)),
];

interface SickListInput {
    rows: Array<SickAbsenceRow>;
    holidays: Set<string>;
    periods: Array<SickListPeriod>;
    groupNames: Map<string, string>;
    names: Map<string, KeycloakNameParts>;
}

export const buildSickListSections = ({ rows, holidays, periods, groupNames, names }: SickListInput): Array<SickListSection> => {
    const episodes = buildEpisodes(rows, holidays);

    return periods.map((period) => {
        const entries = episodes.flatMap((episode): Array<SickListEntry> => {
            const days = episode.days.filter((day) => day.date >= period.from && day.date <= period.to);
            const first = days[0];
            const last = days.at(-1);
            if (first === undefined || last === undefined) {
                return [];
            }
            const episodeStart = episode.days[0]!.date;
            const episodeEnd = episode.days.at(-1)!.date;
            return [
                {
                    userId: episode.userId,
                    ...resolveName(names.get(episode.userId), episode.userName),
                    groupName: groupNames.get(episode.groupId) ?? '',
                    from: first.date,
                    to: last.date,
                    workdays: days.length,
                    hours: roundHours(days.reduce((sum, day) => sum + day.hours, 0)),
                    holidays: days.filter((day) => holidays.has(day.date)).length,
                    certificate: getCertificate(days),
                    illnessStart: episodeStart < first.date ? episodeStart : null,
                    illnessEnd: episodeEnd > last.date ? episodeEnd : null,
                },
            ];
        });

        entries.sort(
            (a, b) =>
                a.lastName.localeCompare(b.lastName, 'de') ||
                a.firstName.localeCompare(b.firstName, 'de') ||
                a.groupName.localeCompare(b.groupName, 'de') ||
                a.from.localeCompare(b.from),
        );

        return { period, entries, totalHours: roundHours(entries.reduce((sum, entry) => sum + entry.hours, 0)) };
    });
};

export async function loadSickList(adminUserId: string, query: SickListQuery): Promise<SickList> {
    const groups = await getSickListGroups(adminUserId);
    const selectedGroups = query.groupId === null ? groups : groups.filter((group) => group.id === query.groupId);
    const groupNames = new Map(groups.map((group) => [group.id, group.name]));

    const months = query.month === null ? Array.from({ length: 12 }, (_, index) => index + 1) : [query.month];
    const periods = months.map((month) => getSickListPeriod(query.year, month, query.mode));
    const windowFrom = addDays(periods[0]?.from ?? `${query.year}-01-01`, -LOOK_AROUND_DAYS);
    const windowTo = addDays(periods.at(-1)?.to ?? `${query.year}-12-31`, LOOK_AROUND_DAYS);

    const [rows, holidays] = await Promise.all([
        getSickAbsences(
            selectedGroups.map((group) => group.id),
            windowFrom,
            windowTo,
        ),
        getPublicHolidayDates(windowFrom, windowTo),
    ]);
    const names = await loadNames(getUserIdsInPeriods(rows, periods));

    return { query, groups, sections: buildSickListSections({ rows, holidays, periods, groupNames, names }) };
}

export const getSickListHint = (entry: SickListEntry): string => {
    const hints: Array<string> = [];
    if (entry.illnessStart !== null) {
        hints.push(`Erkrankung seit ${formatGermanDate(entry.illnessStart)}`);
    }
    if (entry.illnessEnd !== null) {
        hints.push(`Erkrankung bis ${formatGermanDate(entry.illnessEnd)}`);
    }
    if (entry.holidays > 0) {
        hints.push(entry.holidays === 1 ? 'davon 1 Feiertag' : `davon ${entry.holidays} Feiertage`);
    }
    return hints.join(', ');
};

const escapeCsv = (value: string): string => {
    // Excel would run cells starting with these characters as formulas.
    const safe = /^[\t\r+=@-]/.test(value) ? `'${value}` : value;
    return /[\n\r";]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

const CSV_BOM = '\uFEFF';

const CSV_HEADER = [
    'Zeitraum',
    'Name',
    'Vorname',
    'Arbeitgeber',
    'Krank ab',
    'Krank bis',
    'Arbeitstage',
    'Fehlstunden',
    'Attest',
    'Hinweis',
];

// Semicolons, decimal commas and a BOM, so German Excel opens the file directly.
export const buildSickListCsv = (list: SickList): string => {
    const lines = list.sections.flatMap(({ period, entries }) =>
        entries.map((entry) => [
            `${formatGermanDate(period.from)} - ${formatGermanDate(period.to)}`,
            entry.lastName,
            entry.firstName,
            entry.groupName,
            formatGermanDate(entry.from),
            formatGermanDate(entry.to),
            String(entry.workdays),
            formatHours(entry.hours),
            SICK_LIST_CERTIFICATE_LABELS[entry.certificate],
            getSickListHint(entry),
        ]),
    );

    return `${CSV_BOM}${[CSV_HEADER, ...lines].map((cells) => cells.map(escapeCsv).join(';')).join('\r\n')}\r\n`;
};
