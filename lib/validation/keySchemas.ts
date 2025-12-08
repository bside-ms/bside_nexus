import { z } from 'zod';

// Shared helpers
export const idSchema = z.string().min(1);
export const uuidLike = z.string().min(1); // DB uses varchar, not enforcing UUID at DB level everywhere

export const userProfileCreateSchema = z.object({
    userId: idSchema.nullish(),
    firstName: z.string().min(1),
    lastName: z.string().optional().nullable(),
    addressStreet: z.string().optional().nullable(),
    addressHouseNumber: z.string().optional().nullable(),
    addressZipCode: z.string().optional().nullable(),
    addressCity: z.string().optional().nullable(),
    phoneNumber: z.string().optional().nullable(),
    emailAddress: z.string().email().optional().nullable(),
    description: z.string().optional().nullable(),
});

export const userProfileUpdateSchema = userProfileCreateSchema.partial();

export const keyTypeCreateSchema = z.object({
    keyNr: z.coerce.number().int(),
    keyDescription: z.string().min(1),
});

export const keyTypeUpdateSchema = z.object({
    keyNr: z.coerce.number().int().optional(),
    keyDescription: z.string().min(1).optional(),
});

export const keyItemCreateSchema = z.object({
    keyTypeId: idSchema,
    seqNumber: z.coerce.number().int().nonnegative(),
    comment: z.string().optional().nullable(),
});

export const fillUpSchema = z.object({
    targetQuantity: z.coerce.number().int().nonnegative(),
});

export const changeStatusSchema = z.object({
    status: z.enum(['active', 'inactive', 'lost', 'broken', 'destroyed']),
});

export const issuanceSchema = z.object({
    userProfileId: idSchema,
    keyItemIds: z.array(idSchema).min(1),
});

export const returnSchema = z.object({
    assignmentIds: z.array(idSchema).min(1),
});

export const lostSchema = z.object({
    assignmentId: idSchema,
});

export const reactivateSchema = z.object({
    keyItemId: idSchema,
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
