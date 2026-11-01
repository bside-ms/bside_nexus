import { z } from 'zod';

// Arbeitstage als ISO-Wochentage: 1 = Mo … 7 = So.
export const workingDaysSchema = z
    .array(z.number().int().min(1).max(7))
    .min(1, 'Bitte wähle mindestens einen Arbeitstag.')
    .transform((days) => [...new Set(days)].sort((a, b) => a - b));

export const contractCreateSchema = z.object({
    userId: z.string().min(1, 'Bitte wähle eine Person.'),
    employerGroupId: z.string().min(1, 'Bitte wähle einen Arbeitgeber.'),
    type: z.enum(['fixed_salary', 'hourly']),
    weeklyHours: z.coerce.number().min(0).max(60),
    hourlyRate: z.coerce.number().min(0),
    vacationDaysPerYear: z.coerce.number().int().min(0).max(60),
    workingDays: workingDaysSchema,
    validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Bitte gib ein gültiges Startdatum an.'),
});

export const contractChangeSchema = z.object({
    type: z.enum(['fixed_salary', 'hourly']),
    weeklyHours: z.coerce.number().min(0).max(60),
    hourlyRate: z.coerce.number().min(0),
    vacationDaysPerYear: z.coerce.number().int().min(0).max(60),
    workingDays: workingDaysSchema,
    // Neuer Vertrag gilt immer ab einem Monatsersten, damit Monatssalden nicht geteilt werden.
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-01$/, 'Der Stichtag muss der 1. eines Monats sein.'),
    // Nur Vorschau, nichts speichern.
    dryRun: z.boolean().optional(),
});

const correctionReasonSchema = z
    .string()
    .trim()
    .min(3, 'Bitte gib eine Begründung an.')
    .max(300, 'Die Begründung darf höchstens 300 Zeichen lang sein.');

const entryTypeSchema = z.enum(['start', 'pause', 'pause_end', 'stop']);

// Höchstens 45 Minuten in der Zukunft.
const entryTimestampSchema = z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Ungültiger Zeitpunkt.')
    .refine((value) => new Date(value).getTime() <= Date.now() + 45 * 60 * 1000, 'Der Zeitpunkt liegt zu weit in der Zukunft.');

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ungültiges Datum.');

export const adminEntryCreateSchema = z.object({
    contractId: z.string().min(1),
    entryType: entryTypeSchema,
    timestamp: entryTimestampSchema,
    reason: correctionReasonSchema,
    dryRun: z.boolean().optional(),
});

export const adminEntryCorrectSchema = z.object({
    id: z.string().min(1),
    entryType: entryTypeSchema,
    timestamp: entryTimestampSchema,
    reason: correctionReasonSchema,
    dryRun: z.boolean().optional(),
});

export const adminEntryDeleteSchema = z.object({
    id: z.string().min(1),
    reason: correctionReasonSchema,
    dryRun: z.boolean().optional(),
});

export const adminAbsenceCreateSchema = z
    .object({
        contractId: z.string().min(1),
        type: z.enum(['vacation', 'sick', 'sick_with', 'compensatory_day']),
        startDate: isoDateSchema,
        endDate: isoDateSchema,
        reason: correctionReasonSchema,
    })
    .refine((data) => data.startDate <= data.endDate, { message: 'Das Enddatum liegt vor dem Startdatum.', path: ['endDate'] });

export const adminAbsenceDeleteSchema = z.object({
    ids: z.array(z.string().min(1)).min(1).max(366),
    reason: correctionReasonSchema,
});
