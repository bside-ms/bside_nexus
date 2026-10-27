import { and, eq, gt, gte, inArray, ne } from 'drizzle-orm';
import { db } from '@/db';
import type { HrpContractEntry } from '@/db/schema';
import {
    hrpAbsencesTable,
    hrpContractsTable,
    hrpDailyRecordTable,
    hrpEventLogTable,
    hrpHolidayConfigsTable,
    hrpLeaveAccountsTable,
    logsTable,
} from '@/db/schema';
import { groupEntriesByWorkday } from '@/lib/hrp/hrpLogic';
import { addDays, format, parseISO, subDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbOrTransaction = typeof db | Transaction;

// Abwesenheiten, deren Stundenwert aus dem Vertrag berechnet wird (siehe createAbsence).
const CONTRACT_BASED_ABSENCE_TYPES = ['vacation', 'sick', 'sick_with', 'compensatory_day'];
// Abwesenheiten, die nur an Arbeitstagen gebucht werden. Ausgleichstage dürfen auch auf freie Tage fallen.
const WORKING_DAY_ABSENCE_TYPES = ['vacation', 'sick', 'sick_with'];

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];

export interface ContractChangeValues {
    type: string;
    weeklyHours: number;
    hourlyRate: string;
    vacationDaysPerYear: number;
    workingDays: Array<number>;
}

export interface ContractChangePreview {
    effectiveFrom: string;
    isRetroactive: boolean;
    eventLogCount: number;
    absenceCount: number;
    futureAbsenceCount: number;
    holidayConfigCount: number;
    leaveAccountYears: Array<number>;
    // Abwesenheiten an Tagen, die keine Arbeitstage mehr sind. Sie werden gelöscht.
    removedAbsenceCount: number;
    // Neue Arbeitstage direkt neben Urlaub, für die kein Urlaub gebucht ist.
    uncoveredDates: Array<string>;
    errors: Array<string>;
}

interface AffectedRecords {
    eventLogIds: Array<string>;
    billedEventLogCount: number;
    absences: Array<{ id: string; date: string; type: string; billed: boolean; deleted: boolean }>;
    holidayConfigIds: Array<string>;
    leaveAccounts: Array<{ id: string; year: number }>;
}

// Nur zum Monatsersten: Saldo, Kappung und Vertragstyp werden pro Monat ausgewertet.
const EFFECTIVE_FROM_PATTERN = /^\d{4}-\d{2}-01$/;
const EFFECTIVE_FROM_ERROR = 'Der Stichtag muss der 1. eines Monats sein.';

const toDateString = (date: Date): string => date.toISOString().slice(0, 10);

const getTodayBerlin = (): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date());

// ISO-Wochentag wie in workingDays: 1 = Mo … 7 = So.
const getWeekday = (date: string): number => {
    const day = parseISO(date).getDay();
    return day === 0 ? 7 : day;
};

const getHoursPerDay = (weeklyHours: number, workingDays: Array<number> | null): string => {
    const workingDaysCount = workingDays !== null && workingDays.length > 0 ? workingDays.length : 5;
    return weeklyHours > 0 ? (weeklyHours / workingDaysCount).toFixed(6) : '0.00';
};

/**
 * Sammelt alles, was ab dem Stichtag am alten Vertrag hängt.
 * Buchungen zählen zu dem Arbeitstag, an dem die Schicht begonnen hat (Nachtschichten).
 */
async function collectAffectedRecords(
    executor: DbOrTransaction,
    contract: HrpContractEntry,
    effectiveFrom: string,
): Promise<AffectedRecords> {
    // Puffer, damit Schichten über Mitternacht und Zeitzonen-Verschiebungen sicher erfasst werden.
    const bufferStart = subDays(parseISO(effectiveFrom), 2);

    const logs = await executor
        .select()
        .from(hrpEventLogTable)
        .where(and(eq(hrpEventLogTable.contractId, contract.id), gte(hrpEventLogTable.loggedTimestamp, bufferStart)));

    const workdayByLogId = new Map<string, string>();
    const activeLogs = logs.filter((log) => log.deletedAt === null);
    for (const [workday, dayLogs] of Object.entries(groupEntriesByWorkday(activeLogs))) {
        for (const log of dayLogs) {
            workdayByLogId.set(log.id, workday);
        }
    }

    const affectedLogs = logs.filter((log) => {
        const workday =
            workdayByLogId.get(log.id) ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(log.loggedTimestamp);
        return workday >= effectiveFrom;
    });

    const absences = await executor
        .select()
        .from(hrpAbsencesTable)
        .where(and(eq(hrpAbsencesTable.contractId, contract.id), gte(hrpAbsencesTable.date, effectiveFrom)));

    const holidayConfigs = await executor
        .select({ id: hrpHolidayConfigsTable.id })
        .from(hrpHolidayConfigsTable)
        .where(and(eq(hrpHolidayConfigsTable.contractId, contract.id), gte(hrpHolidayConfigsTable.date, effectiveFrom)));

    // Jahreskonten bleiben am alten Vertrag, solange er in dem Jahr noch gilt.
    const lastYearOfOldContract = subDays(parseISO(effectiveFrom), 1).getFullYear();
    const leaveAccounts = await executor
        .select({ id: hrpLeaveAccountsTable.id, year: hrpLeaveAccountsTable.year })
        .from(hrpLeaveAccountsTable)
        .where(and(eq(hrpLeaveAccountsTable.contractId, contract.id), gt(hrpLeaveAccountsTable.year, lastYearOfOldContract)));

    return {
        eventLogIds: affectedLogs.filter((log) => !log.abgerechnet && log.abgerechnet_date === null).map((log) => log.id),
        billedEventLogCount: affectedLogs.filter((log) => log.abgerechnet || log.abgerechnet_date !== null).length,
        absences: absences.map((a) => ({
            id: a.id,
            date: a.date,
            type: a.type,
            billed: a.abgerechnet_date !== null,
            deleted: a.deletedAt !== null,
        })),
        holidayConfigIds: holidayConfigs.map((c) => c.id),
        leaveAccounts,
    };
}

async function validateChange(
    executor: DbOrTransaction,
    contract: HrpContractEntry,
    newType: string,
    effectiveFrom: string,
    affected: AffectedRecords,
): Promise<Array<string>> {
    const errors: Array<string> = [];

    if (effectiveFrom <= toDateString(contract.validFrom)) {
        errors.push('Der Stichtag muss nach dem Beginn des Vertrags liegen.');
    }

    if (contract.validTo && effectiveFrom > toDateString(contract.validTo)) {
        errors.push('Der Stichtag liegt nach dem Ende des Vertrags.');
    }

    // Nur die neueste Fassung eines Vertrags darf geändert werden, sonst überschneiden sich Verträge.
    const newerVersion = await executor
        .select({ id: hrpContractsTable.id })
        .from(hrpContractsTable)
        .where(
            and(
                eq(hrpContractsTable.userId, contract.userId),
                eq(hrpContractsTable.employerGroupId, contract.employerGroupId),
                ne(hrpContractsTable.id, contract.id),
                gt(hrpContractsTable.validFrom, contract.validFrom),
            ),
        )
        .limit(1);
    if (newerVersion.length > 0) {
        errors.push('Es gibt bereits eine neuere Fassung dieses Vertrags. Bitte ändere diese.');
    }

    if (newType !== contract.type && effectiveFrom < getTodayBerlin()) {
        errors.push('Die Vertragsart kann nicht rückwirkend geändert werden.');
    }

    const billedCount = affected.billedEventLogCount + affected.absences.filter((a) => a.billed).length;
    if (billedCount > 0) {
        errors.push(`Ab dem Stichtag gibt es bereits abgerechnete Einträge (${billedCount}). Bitte wähle einen späteren Stichtag.`);
    }

    return errors;
}

interface WorkingDayChange {
    removedAbsenceIds: Array<string>;
    uncoveredDates: Array<string>;
}

/**
 * Folgen geänderter Arbeitstage für die übernommenen Abwesenheiten:
 * - Urlaub und Krankheit an Tagen, die keine Arbeitstage mehr sind, entfallen (der Urlaubstag wird frei).
 * - Neue Arbeitstage neben gebuchtem Urlaub haben nun Soll aber keinen Urlaub.
 */
const analyzeWorkingDayChange = (
    oldWorkingDays: Array<number>,
    newWorkingDays: Array<number>,
    effectiveFrom: string,
    affected: AffectedRecords,
): WorkingDayChange => {
    const activeAbsences = affected.absences.filter((a) => !a.billed && !a.deleted);

    const removedAbsenceIds = activeAbsences
        .filter((a) => WORKING_DAY_ABSENCE_TYPES.includes(a.type) && !newWorkingDays.includes(getWeekday(a.date)))
        .map((a) => a.id);

    const addedWorkingDays = newWorkingDays.filter((day) => !oldWorkingDays.includes(day));
    const vacationDates = activeAbsences
        .filter((a) => a.type === 'vacation')
        .map((a) => a.date)
        .sort();
    const lastVacationDate = vacationDates.at(-1);
    if (addedWorkingDays.length === 0 || lastVacationDate === undefined) {
        return { removedAbsenceIds, uncoveredDates: [] };
    }

    const vacationDateSet = new Set(vacationDates);
    const absenceDateSet = new Set(activeAbsences.map((a) => a.date));

    // Urlaub am nächsten bisherigen Arbeitstag davor oder danach?
    const isNextToVacation = (date: string): boolean =>
        [-1, 1].some((direction) => {
            for (let offset = 1; offset <= 7; offset++) {
                const neighbour = format(addDays(parseISO(date), direction * offset), 'yyyy-MM-dd');
                if (oldWorkingDays.includes(getWeekday(neighbour))) {
                    return vacationDateSet.has(neighbour);
                }
            }
            return false;
        });

    const uncoveredDates: Array<string> = [];
    const end = format(addDays(parseISO(lastVacationDate), 7), 'yyyy-MM-dd');
    for (let date = effectiveFrom; date <= end; date = format(addDays(parseISO(date), 1), 'yyyy-MM-dd')) {
        if (addedWorkingDays.includes(getWeekday(date)) && !absenceDateSet.has(date) && isNextToVacation(date)) {
            uncoveredDates.push(date);
        }
    }

    return { removedAbsenceIds, uncoveredDates };
};

const emptyAffectedRecords = (): AffectedRecords => ({
    eventLogIds: [],
    billedEventLogCount: 0,
    absences: [],
    holidayConfigIds: [],
    leaveAccounts: [],
});

const buildPreview = (
    effectiveFrom: string,
    affected: AffectedRecords,
    workingDayChange: WorkingDayChange,
    errors: Array<string>,
): ContractChangePreview => {
    const today = getTodayBerlin();
    const movableAbsences = affected.absences.filter((a) => !a.billed && !a.deleted);

    return {
        effectiveFrom,
        isRetroactive: effectiveFrom < today,
        eventLogCount: affected.eventLogIds.length,
        absenceCount: movableAbsences.length,
        futureAbsenceCount: movableAbsences.filter((a) => a.date > today).length,
        holidayConfigCount: affected.holidayConfigIds.length,
        leaveAccountYears: affected.leaveAccounts.map((a) => a.year).sort(),
        removedAbsenceCount: workingDayChange.removedAbsenceIds.length,
        uncoveredDates: workingDayChange.uncoveredDates,
        errors,
    };
};

async function getContract(executor: DbOrTransaction, contractId: string): Promise<HrpContractEntry> {
    const contract = (await executor.select().from(hrpContractsTable).where(eq(hrpContractsTable.id, contractId)).limit(1))[0];
    if (!contract) {
        throw new Error('Vertrag nicht gefunden');
    }
    return contract;
}

/**
 * Zeigt, was eine Vertragsänderung zum Stichtag bewirken würde, ohne etwas zu schreiben.
 */
export async function previewContractChange(
    contractId: string,
    newValues: Pick<ContractChangeValues, 'type' | 'workingDays'>,
    effectiveFrom: string,
): Promise<ContractChangePreview> {
    if (!EFFECTIVE_FROM_PATTERN.test(effectiveFrom)) {
        return buildPreview(effectiveFrom, emptyAffectedRecords(), { removedAbsenceIds: [], uncoveredDates: [] }, [EFFECTIVE_FROM_ERROR]);
    }

    const contract = await getContract(db, contractId);
    const affected = await collectAffectedRecords(db, contract, effectiveFrom);
    const workingDayChange = analyzeWorkingDayChange(
        contract.workingDays ?? DEFAULT_WORKING_DAYS,
        newValues.workingDays,
        effectiveFrom,
        affected,
    );
    const errors = await validateChange(db, contract, newValues.type, effectiveFrom, affected);

    return buildPreview(effectiveFrom, affected, workingDayChange, errors);
}

/**
 * Vertrag zum Stichtag ändern. Auch möglich rückwirkend. Dann werden am Vertrag hängende Daten mitgezogen.
 */
export async function changeContract(
    contractId: string,
    newValues: ContractChangeValues,
    effectiveFrom: string,
    actor: { userId: string; ipAddress: string },
): Promise<{ newId: string } | { errors: Array<string> }> {
    if (!EFFECTIVE_FROM_PATTERN.test(effectiveFrom)) {
        return { errors: [EFFECTIVE_FROM_ERROR] };
    }

    return db.transaction(async (tx): Promise<{ newId: string } | { errors: Array<string> }> => {
        const contract = await getContract(tx, contractId);
        const affected = await collectAffectedRecords(tx, contract, effectiveFrom);
        const errors = await validateChange(tx, contract, newValues.type, effectiveFrom, affected);
        if (errors.length > 0) {
            return { errors };
        }

        const workingDayChange = analyzeWorkingDayChange(
            contract.workingDays ?? DEFAULT_WORKING_DAYS,
            newValues.workingDays,
            effectiveFrom,
            affected,
        );
        const preview = buildPreview(effectiveFrom, affected, workingDayChange, errors);
        const newId = uuidv4();

        await tx
            .update(hrpContractsTable)
            .set({ validTo: new Date(format(subDays(parseISO(effectiveFrom), 1), 'yyyy-MM-dd')) })
            .where(eq(hrpContractsTable.id, contract.id));

        await tx.insert(hrpContractsTable).values({
            id: newId,
            userId: contract.userId,
            employerGroupId: contract.employerGroupId,
            type: newValues.type,
            weeklyHours: newValues.weeklyHours,
            hourlyRate: newValues.hourlyRate,
            vacationDaysPerYear: newValues.vacationDaysPerYear,
            workingDays: newValues.workingDays,
            validFrom: new Date(effectiveFrom),
            validTo: contract.validTo, // Behalte das ursprüngliche Enddatum bei (falls vorhanden)
        });

        if (affected.eventLogIds.length > 0) {
            await tx.update(hrpEventLogTable).set({ contractId: newId }).where(inArray(hrpEventLogTable.id, affected.eventLogIds));
        }

        const movableAbsences = affected.absences.filter((a) => !a.billed);
        if (movableAbsences.length > 0) {
            await tx
                .update(hrpAbsencesTable)
                .set({ contractId: newId })
                .where(
                    inArray(
                        hrpAbsencesTable.id,
                        movableAbsences.map((a) => a.id),
                    ),
                );

            if (workingDayChange.removedAbsenceIds.length > 0) {
                await tx
                    .update(hrpAbsencesTable)
                    .set({
                        deletedAt: new Date(),
                        deletedBy: actor.userId,
                        deletionReason: 'Kein Arbeitstag mehr nach Vertragsänderung',
                    })
                    .where(inArray(hrpAbsencesTable.id, workingDayChange.removedAbsenceIds));
            }

            const recalculatedIds = movableAbsences
                .filter((a) => CONTRACT_BASED_ABSENCE_TYPES.includes(a.type) && !workingDayChange.removedAbsenceIds.includes(a.id))
                .map((a) => a.id);
            if (recalculatedIds.length > 0) {
                await tx
                    .update(hrpAbsencesTable)
                    .set({ hoursValue: getHoursPerDay(newValues.weeklyHours, newValues.workingDays) })
                    .where(inArray(hrpAbsencesTable.id, recalculatedIds));
            }
        }

        if (affected.holidayConfigIds.length > 0) {
            await tx
                .update(hrpHolidayConfigsTable)
                .set({ contractId: newId })
                .where(inArray(hrpHolidayConfigsTable.id, affected.holidayConfigIds));
        }

        if (affected.leaveAccounts.length > 0) {
            await tx
                .update(hrpLeaveAccountsTable)
                .set({ contractId: newId })
                .where(
                    inArray(
                        hrpLeaveAccountsTable.id,
                        affected.leaveAccounts.map((a) => a.id),
                    ),
                );
        }

        // Abgeleitete Tagesdaten folgen dem Vertrag.
        await tx
            .update(hrpDailyRecordTable)
            .set({ contractId: newId })
            .where(and(eq(hrpDailyRecordTable.contractId, contract.id), gte(hrpDailyRecordTable.date, effectiveFrom)));

        // Im selben Commit wie die Änderung, damit Protokoll und Daten nie auseinanderlaufen.
        await tx.insert(logsTable).values({
            id: uuidv4(),
            userId: actor.userId,
            ipAddress: actor.ipAddress,
            eventType: 'hrp.contract.change',
            affectedUserId: contract.userId,
            affectedGroupId: contract.employerGroupId,
            description:
                `Vertrag ${contract.id} ab ${effectiveFrom} geändert${preview.isRetroactive ? ' (rückwirkend)' : ''}, neuer Vertrag ${newId}: ` +
                `${contract.type} → ${newValues.type}, ${contract.weeklyHours ?? 0} h → ${newValues.weeklyHours} h, ` +
                `${contract.hourlyRate ?? '0.00'} € → ${newValues.hourlyRate} €, ` +
                `${contract.vacationDaysPerYear ?? 0} → ${newValues.vacationDaysPerYear} Urlaubstage, ` +
                `Arbeitstage ${(contract.workingDays ?? DEFAULT_WORKING_DAYS).join(',')} → ${newValues.workingDays.join(',')}. ` +
                `Übernommen: ${preview.eventLogCount} Buchungen, ${preview.absenceCount} Abwesenheiten, ` +
                `${preview.holidayConfigCount} Feiertagsregeln, Jahreskonten ${preview.leaveAccountYears.join(', ') || '–'}. ` +
                `Gelöscht (kein Arbeitstag mehr): ${preview.removedAbsenceCount} Abwesenheiten.`,
        });

        return { newId };
    });
}
