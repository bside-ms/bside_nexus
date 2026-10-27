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
