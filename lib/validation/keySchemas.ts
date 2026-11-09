import { KEY_DELETION_KINDS, KEY_PROFILE_KINDS, KEY_PROTOCOL_TYPES } from '@/lib/key/constants';
import { z } from '@/lib/zod';

// Shared helpers (also used by other modules)
export const idSchema = z.string().min(1);

// Empty strings from forms become null.
const optionalText = (max: number): z.ZodType<string | null> =>
    z
        .string()
        .trim()
        .max(max)
        .nullish()
        .transform((value) => (value === undefined || value === null || value === '' ? null : value));

export const keyProfileSchema = z
    .object({
        profileKind: z.enum(KEY_PROFILE_KINDS),
        userId: optionalText(255),
        firstName: z.string().trim().min(1, 'Bitte gib einen Namen an.').max(255),
        lastName: optionalText(255),
        addressStreet: optionalText(255),
        addressHouseNumber: optionalText(50),
        addressZipCode: optionalText(20),
        addressCity: optionalText(255),
        phoneNumber: optionalText(50),
        emailAddress: optionalText(255),
        description: optionalText(2000),
    })
    .refine((value) => value.emailAddress === null || z.email().safeParse(value.emailAddress).success, {
        message: 'Bitte gib eine gültige E-Mail-Adresse an.',
        path: ['emailAddress'],
    });

export const keyTypeSchema = z.object({
    keyNr: z.coerce.number().int().min(0).max(9999),
    keyDescription: z.string().trim().min(1, 'Bitte gib eine Bezeichnung an.').max(255),
    totalQuantity: z.coerce.number().int().min(0).max(9999).nullable(),
});

const protocolLineSchema = z.discriminatedUnion('lineType', [
    z.object({
        lineType: z.literal('key'),
        keyTypeId: idSchema,
        quantity: z.coerce.number().int().min(1).max(99),
    }),
    z.object({
        lineType: z.literal('transponder'),
        transponderSerial: z.string().trim().min(1, 'Bitte gib die Seriennummer des Transponders an.').max(50),
        description: z.string().trim().max(255).nullish(),
    }),
]);

export const protocolCreateSchema = z.object({
    protocolType: z.enum(KEY_PROTOCOL_TYPES),
    userProfileId: idSchema,
    lines: z.array(protocolLineSchema).min(1, 'Bitte gib mindestens eine Zeile an.').max(40),
    comment: z.string().trim().max(2000).nullish(),
    // Only for backdated entries. Missing = today, null = unknown.
    protocolDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Bitte gib ein gültiges Datum an.')
        .refine((value) => value <= new Date().toISOString().slice(0, 10), 'Das Datum darf nicht in der Zukunft liegen.')
        .nullish(),
    withoutReceipt: z.boolean().optional(),
});

export const protocolCancelSchema = z.object({
    kind: z.enum(KEY_DELETION_KINDS),
    reason: z.string().trim().min(3, 'Bitte gib einen Grund an.').max(2000),
});

// Date written on the paper receipt. Empty = unknown.
export const protocolScanSchema = z.object({
    date: z
        .string()
        .trim()
        .regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Bitte gib ein gültiges Datum an.')
        .transform((value) => (value === '' ? null : value)),
});

export interface ZodErrorShape {
    error: string;
    issues?: Array<z.ZodIssue>;
}

export const parseOrError = <T>(schema: z.ZodType<T>, data: unknown): { ok: true; data: T } | { ok: false; error: ZodErrorShape } => {
    const res = schema.safeParse(data);
    if (res.success) {
        return { ok: true, data: res.data };
    }
    return { ok: false, error: { error: 'Validation failed', issues: res.error.issues } };
};
