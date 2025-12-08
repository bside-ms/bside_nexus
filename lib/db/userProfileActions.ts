import { and, count, desc, eq, isNull, not } from 'drizzle-orm';
import { db } from '@/db';
import { userProfilesTable, usersTable } from '@/db/schema';

export type CreateUserProfileInput = {
    userId?: string | null;
    firstName: string;
    lastName?: string | null;
    addressStreet?: string | null;
    addressHouseNumber?: string | null;
    addressZipCode?: string | null;
    addressCity?: string | null;
    phoneNumber?: string | null;
    emailAddress?: string | null;
    description?: string | null;
    createdBy?: string | null;
};

export const createUserProfile = async (input: CreateUserProfileInput) => {
    const values = {
        id: crypto.randomUUID(),
        userId: input.userId ?? null,
        firstName: input.firstName,
        lastName: input.lastName ?? null,
        addressStreet: input.addressStreet ?? null,
        addressHouseNumber: input.addressHouseNumber ?? null,
        addressZipCode: input.addressZipCode ?? null,
        addressCity: input.addressCity ?? null,
        phoneNumber: input.phoneNumber ?? null,
        emailAddress: input.emailAddress ?? null,
        description: input.description ?? null,
        createdBy: input.createdBy ?? null,
    } as const;

    // If a userId is given, ensure there is at most one active (not deleted/updated) profile per user.
    // Our schema enforces this via partial unique index; we just do a best-effort check for clearer error.
    if (values.userId) {
        const exists = await db
            .select({ c: count() })
            .from(userProfilesTable)
            .where(
                and(
                    eq(userProfilesTable.userId, values.userId),
                    isNull(userProfilesTable.updatedAt),
                    isNull(userProfilesTable.deleteAt),
                ),
            );
        if ((exists[0]?.c ?? 0) > 0) {
            throw new Error('Es existiert bereits ein aktives Profil für diese Nutzer*in.');
        }
    }

    const [row] = await db.insert(userProfilesTable).values(values).returning();
    return row;
};

export type UpdateUserProfileInput = {
    id: string;
    firstName?: string;
    lastName?: string | null;
    addressStreet?: string | null;
    addressHouseNumber?: string | null;
    addressZipCode?: string | null;
    addressCity?: string | null;
    phoneNumber?: string | null;
    emailAddress?: string | null;
    description?: string | null;
};

export const updateUserProfile = async (input: UpdateUserProfileInput) => {
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
        if (k === 'id') continue;
        if (v !== undefined) patch[k] = v;
    }
    if (Object.keys(patch).length === 0) return null;
    const [row] = await db
        .update(userProfilesTable)
        .set(patch)
        .where(eq(userProfilesTable.id, input.id))
        .returning();
    return row;
};

export const softDeleteUserProfile = async (id: string) => {
    const [row] = await db
        .update(userProfilesTable)
        .set({ deleteAt: new Date() })
        .where(eq(userProfilesTable.id, id))
        .returning();
    return row;
};

export const getUserProfile = async (id: string) => {
    const res = await db.select().from(userProfilesTable).where(eq(userProfilesTable.id, id)).limit(1);
    return res[0] ?? null;
};

export const listUserProfiles = async (q?: string | null) => {
    // simple filter over name/email; drizzle lacks ilike helper in this setup, so fetch and filter in memory for now
    const rows = await db
        .select()
        .from(userProfilesTable)
        .where(isNull(userProfilesTable.deleteAt))
        .orderBy(desc(userProfilesTable.createdAt));
    if (!q) return rows;
    const query = q.toLowerCase();
    return rows.filter((r) =>
        [r.firstName, r.lastName, r.emailAddress, r.addressCity]
            .filter(Boolean)
            .some((f) => String(f).toLowerCase().includes(query)),
    );
};
