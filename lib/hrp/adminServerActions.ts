'use server';

import type { HrpHolidayConfigEntry, HrpPayrollHourlyForecastEntry } from '@/db/schema';
import { getContractAtDate } from '@/lib/db/contractActions';
import {
    belongToContractUser,
    bookHoliday as bookHolidayInDb,
    canViewPayroll,
    createPayrollHourly as createPayrollHourlyInDb,
    getContractById,
    getHolidayConfigById,
    recalculatePayrollFixed,
    upsertForecast as upsertForecastInDb,
    upsertHolidayConfig as upsertHolidayConfigInDb,
} from '@/lib/db/hrpAdminActions';
import { getContractAdminSession } from '@/lib/hrp/adminAccess';

const NOT_ALLOWED = 'Du hast keine Berechtigung, diesen Vertrag zu verwalten.';
const HOLIDAY_STRATEGIES = ['off', 'work_required', 'credited'] as const;

type HolidayStrategy = (typeof HOLIDAY_STRATEGIES)[number];

const isHolidayStrategy = (value: string): value is HolidayStrategy => (HOLIDAY_STRATEGIES as ReadonlyArray<string>).includes(value);

const isValidMonth = (year: number, month: number): boolean =>
    Number.isInteger(year) && Number.isInteger(month) && month >= 0 && month <= 11;

export async function upsertHolidayConfig(data: {
    id?: string;
    contractId: string;
    date: string;
    strategy: HolidayStrategy;
}): Promise<{ success: boolean; data?: HrpHolidayConfigEntry; error?: string }> {
    if ((await getContractAdminSession(data.contractId)) === null) {
        return { success: false, error: NOT_ALLOWED };
    }
    if (!isHolidayStrategy(data.strategy)) {
        return { success: false, error: 'Unbekannte Feiertagsregel.' };
    }
    if (data.id !== undefined) {
        const existing = await getHolidayConfigById(data.id);
        if (existing?.contractId !== data.contractId) {
            return { success: false, error: 'Die Feiertagseinstellung wurde nicht gefunden.' };
        }
    }

    // Status, Ausgleichstag und Kommentar setzt nur die Server-Logik, nicht der Client.
    return upsertHolidayConfigInDb({ id: data.id, contractId: data.contractId, date: data.date, strategy: data.strategy });
}

export async function bookHoliday(holidayId: string, userId: string, contractId: string, date: string): Promise<void> {
    if ((await getContractAdminSession(contractId)) === null) {
        throw new Error(NOT_ALLOWED);
    }

    const [contract, holidayConfig] = await Promise.all([getContractById(contractId), getHolidayConfigById(holidayId)]);
    if (contract?.userId !== userId || holidayConfig?.contractId !== contractId || holidayConfig.date !== date) {
        throw new Error('Feiertag und Vertrag passen nicht zusammen.');
    }

    await bookHolidayInDb(holidayId, userId, contractId, date);
}

export async function upsertForecast(data: {
    contractId: string;
    year: number;
    month: number;
    forecastedHours: string;
}): Promise<HrpPayrollHourlyForecastEntry> {
    if (!(await canViewPayroll()) || (await getContractAdminSession(data.contractId)) === null) {
        throw new Error(NOT_ALLOWED);
    }
    if (!isValidMonth(data.year, data.month)) {
        throw new Error('Ungültiger Abrechnungsmonat.');
    }

    return upsertForecastInDb({ contractId: data.contractId, year: data.year, month: data.month, forecastedHours: data.forecastedHours });
}

export async function createPayrollHourly(data: {
    contractId: string;
    year: number;
    month: number;
    recordedHours: string;
    forecastedHours: string;
    correctionFromPrevMonth: string;
    finalPayoutHours: string;
    eventLogIds: Array<string>;
    absenceIds?: Array<string>;
}): Promise<string> {
    if (!(await canViewPayroll()) || (await getContractAdminSession(data.contractId)) === null) {
        throw new Error(NOT_ALLOWED);
    }
    if (!isValidMonth(data.year, data.month)) {
        throw new Error('Ungültiger Abrechnungsmonat.');
    }
    if (!(await belongToContractUser(data.contractId, data.eventLogIds, data.absenceIds ?? []))) {
        throw new Error('Die Abrechnung enthält Einträge, die nicht zu diesem Vertrag gehören.');
    }

    return createPayrollHourlyInDb(data);
}

export async function recalculatePayrollFixedForUserAtDate(userId: string, year: number, month: number): Promise<void> {
    if (!isValidMonth(year, month)) {
        throw new Error('Ungültiger Abrechnungsmonat.');
    }

    const contractForMonth = await getContractAtDate(userId, new Date(year, month, 1));
    if (!contractForMonth) {
        throw new Error('Kein gültiger Vertrag für diesen Monat gefunden');
    }
    if ((await getContractAdminSession(contractForMonth.contractId)) === null) {
        throw new Error(NOT_ALLOWED);
    }

    await recalculatePayrollFixed(contractForMonth.contractId, year, month);
}
