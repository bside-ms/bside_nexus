import { and, asc, count, eq, inArray, isNull, ne } from 'drizzle-orm';
import { db } from '@/db';
import type { KeysBaseEntry, UserProfileEntry } from '@/db/schema';
import { keyProtocolsTable, keysBaseTable, userProfilesTable, usersTable } from '@/db/schema';
import { listNetHoldings } from '@/lib/db/keyProtocolActions';
import type { KeyProfileKind } from '@/lib/key/constants';
import { formatKeyNr, formatProfileName, toKeyProfileKind } from '@/lib/key/constants';
import { KeyActionError } from '@/lib/key/errors';

// ---
// Profiles (persons and key safes)
// ---

export interface KeyProfileInput {
    profileKind: KeyProfileKind;
    userId: string | null;
    firstName: string;
    lastName: string | null;
    addressStreet: string | null;
    addressHouseNumber: string | null;
    addressZipCode: string | null;
    addressCity: string | null;
    phoneNumber: string | null;
    emailAddress: string | null;
    description: string | null;
}

export interface KeyProfileListEntry {
    id: string;
    profileNumber: number | null;
    profileKind: KeyProfileKind;
    name: string;
    emailAddress: string | null;
    phoneNumber: string | null;
    addressCity: string | null;
    description: string | null;
    userId: string | null;
    keyCount: number;
    transponderCount: number;
}

export const getProfileKind = (profile: Pick<UserProfileEntry, 'profileKind'>): KeyProfileKind => toKeyProfileKind(profile.profileKind);

export const listKeyProfiles = async (): Promise<Array<KeyProfileListEntry>> => {
    const [profiles, holdings] = await Promise.all([
        db
            .select()
            .from(userProfilesTable)
            .where(isNull(userProfilesTable.deleteAt))
            .orderBy(asc(userProfilesTable.firstName), asc(userProfilesTable.lastName)),
        listNetHoldings(),
    ]);

    const counts = new Map<string, { keys: number; transponders: number }>();
    for (const holding of holdings) {
        const entry = counts.get(holding.userProfileId) ?? { keys: 0, transponders: 0 };
        if (holding.lineType === 'transponder') {
            entry.transponders += holding.quantity;
        } else {
            entry.keys += holding.quantity;
        }
        counts.set(holding.userProfileId, entry);
    }

    return profiles.map((profile) => ({
        id: profile.id,
        profileNumber: profile.profileNumber,
        profileKind: getProfileKind(profile),
        name: formatProfileName(profile),
        emailAddress: profile.emailAddress,
        phoneNumber: profile.phoneNumber,
        addressCity: profile.addressCity,
        description: profile.description,
        userId: profile.userId,
        keyCount: counts.get(profile.id)?.keys ?? 0,
        transponderCount: counts.get(profile.id)?.transponders ?? 0,
    }));
};

export const getKeyProfile = async (id: string): Promise<UserProfileEntry | null> => {
    const [profile] = await db
        .select()
        .from(userProfilesTable)
        .where(and(eq(userProfilesTable.id, id), isNull(userProfilesTable.deleteAt)))
        .limit(1);
    return profile ?? null;
};

// Safes have no person data. Old values are cleared, so they don't end up on a receipt.
const normalizeProfileInput = (input: KeyProfileInput): KeyProfileInput =>
    input.profileKind === 'safe'
        ? {
              ...input,
              userId: null,
              lastName: null,
              addressStreet: null,
              addressHouseNumber: null,
              addressZipCode: null,
              addressCity: null,
              phoneNumber: null,
              emailAddress: null,
          }
        : input;

// At most one active profile per Nexus account (also enforced by a unique index).
const assertUserIdFree = async (userId: string | null, exceptProfileId?: string): Promise<void> => {
    if (userId === null) {
        return;
    }
    const conditions = [
        eq(userProfilesTable.userId, userId),
        isNull(userProfilesTable.deleteAt),
        isNull(userProfilesTable.updatedAt),
        ...(exceptProfileId === undefined ? [] : [ne(userProfilesTable.id, exceptProfileId)]),
    ];
    const [row] = await db
        .select({ value: count() })
        .from(userProfilesTable)
        .where(and(...conditions));
    if ((row?.value ?? 0) > 0) {
        throw new KeyActionError('Mit diesem Account ist bereits ein anderes Profil verknüpft.', 409);
    }
};

export const createKeyProfile = async (input: KeyProfileInput, createdBy: string | null): Promise<UserProfileEntry> => {
    const values = normalizeProfileInput(input);
    await assertUserIdFree(values.userId);
    const [row] = await db
        .insert(userProfilesTable)
        .values({ id: crypto.randomUUID(), ...values, createdBy })
        .returning();
    if (row === undefined) {
        throw new Error('Creating the profile failed');
    }
    return row;
};

// updatedAt marks old profile versions (see the unique index), so it is not set here.
export const updateKeyProfile = async (id: string, input: KeyProfileInput): Promise<UserProfileEntry> => {
    const values = normalizeProfileInput(input);
    await assertUserIdFree(values.userId, id);
    const [row] = await db
        .update(userProfilesTable)
        .set(values)
        .where(and(eq(userProfilesTable.id, id), isNull(userProfilesTable.deleteAt)))
        .returning();
    if (row === undefined) {
        throw new KeyActionError('Das Profil gibt es nicht (mehr).', 404);
    }
    return row;
};

export const deleteKeyProfile = async (id: string): Promise<UserProfileEntry> => {
    const holdings = await listNetHoldings({ userProfileId: id });
    if (holdings.length > 0) {
        throw new KeyActionError('Das Profil hat noch Schlüssel oder Transponder. Erst nach der Rückgabe kann es gelöscht werden.', 409);
    }
    const [row] = await db
        .update(userProfilesTable)
        .set({ deleteAt: new Date() })
        .where(and(eq(userProfilesTable.id, id), isNull(userProfilesTable.deleteAt)))
        .returning();
    if (row === undefined) {
        throw new KeyActionError('Das Profil gibt es nicht (mehr).', 404);
    }
    return row;
};

export interface LinkableUser {
    id: string;
    label: string;
}

export const listLinkableUsers = async (): Promise<Array<LinkableUser>> => {
    const users = await db
        .select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName })
        .from(usersTable)
        .where(eq(usersTable.enabled, true));
    return users
        .map((user) => ({ id: user.id, label: `${user.displayName ?? user.username} (@${user.username})` }))
        .sort((a, b) => a.label.localeCompare(b.label, 'de'));
};

export const getUserLabel = async (userId: string): Promise<string | null> => {
    const [user] = await db
        .select({ username: usersTable.username, displayName: usersTable.displayName })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
    return user === undefined ? null : `${user.displayName ?? user.username} (@${user.username})`;
};

// ---
// Key types (Schließungen)
// ---

export interface KeyTypeInput {
    keyNr: number;
    keyDescription: string;
    totalQuantity: number | null;
}

export interface KeyTypeListEntry extends KeysBaseEntry {
    issued: number;
    holders: number;
    // null if the stock is unknown
    available: number | null;
}

const withStats = (keyType: KeysBaseEntry, issued: number, holders: number): KeyTypeListEntry => ({
    ...keyType,
    issued,
    holders,
    available: keyType.totalQuantity === null ? null : keyType.totalQuantity - issued,
});

export const listKeyTypes = async (): Promise<Array<KeyTypeListEntry>> => {
    const [keyTypes, holdings] = await Promise.all([
        db.select().from(keysBaseTable).where(isNull(keysBaseTable.deleteAt)).orderBy(asc(keysBaseTable.keyNr)),
        listNetHoldings(),
    ]);

    const stats = new Map<string, { issued: number; holders: number }>();
    for (const holding of holdings) {
        if (holding.keyTypeId === null) {
            continue;
        }
        const entry = stats.get(holding.keyTypeId) ?? { issued: 0, holders: 0 };
        entry.issued += holding.quantity;
        entry.holders += 1;
        stats.set(holding.keyTypeId, entry);
    }

    return keyTypes.map((keyType) => withStats(keyType, stats.get(keyType.id)?.issued ?? 0, stats.get(keyType.id)?.holders ?? 0));
};

export interface KeyTypeHolder {
    userProfileId: string;
    name: string;
    profileKind: KeyProfileKind;
    profileNumber: number | null;
    quantity: number;
}

export interface KeyTypeDetails {
    keyType: KeyTypeListEntry;
    holders: Array<KeyTypeHolder>;
}

export const getKeyTypeDetails = async (id: string): Promise<KeyTypeDetails | null> => {
    const [keyType] = await db
        .select()
        .from(keysBaseTable)
        .where(and(eq(keysBaseTable.id, id), isNull(keysBaseTable.deleteAt)))
        .limit(1);
    if (keyType === undefined) {
        return null;
    }

    const holdings = await listNetHoldings({ keyTypeId: id });
    const profileIds = [...new Set(holdings.map((holding) => holding.userProfileId))];
    const profiles =
        profileIds.length === 0 ? [] : await db.select().from(userProfilesTable).where(inArray(userProfilesTable.id, profileIds));
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

    const holders = holdings
        .map((holding): KeyTypeHolder | null => {
            const profile = profileById.get(holding.userProfileId);
            if (profile === undefined) {
                return null;
            }
            return {
                userProfileId: profile.id,
                name: formatProfileName(profile),
                profileKind: getProfileKind(profile),
                profileNumber: profile.profileNumber,
                quantity: holding.quantity,
            };
        })
        .filter((holder): holder is KeyTypeHolder => holder !== null)
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    const issued = holders.reduce((sum, holder) => sum + holder.quantity, 0);
    return { keyType: withStats(keyType, issued, holders.length), holders };
};

const assertKeyNrFree = async (keyNr: number, exceptId?: string): Promise<void> => {
    const conditions = [
        eq(keysBaseTable.keyNr, keyNr),
        isNull(keysBaseTable.deleteAt),
        ...(exceptId === undefined ? [] : [ne(keysBaseTable.id, exceptId)]),
    ];
    const [row] = await db
        .select({ value: count() })
        .from(keysBaseTable)
        .where(and(...conditions));
    if ((row?.value ?? 0) > 0) {
        throw new KeyActionError(`Die Schließung ${formatKeyNr(keyNr)} gibt es bereits.`, 409);
    }
};

export const createKeyType = async (input: KeyTypeInput, createdBy: string | null): Promise<KeysBaseEntry> => {
    await assertKeyNrFree(input.keyNr);
    const [row] = await db
        .insert(keysBaseTable)
        .values({ id: crypto.randomUUID(), ...input, createdBy })
        .returning();
    if (row === undefined) {
        throw new Error('Creating the key type failed');
    }
    return row;
};

export const updateKeyType = async (id: string, input: KeyTypeInput): Promise<KeysBaseEntry> => {
    await assertKeyNrFree(input.keyNr, id);
    const [row] = await db
        .update(keysBaseTable)
        .set({ ...input, updatedAt: new Date() })
        .where(and(eq(keysBaseTable.id, id), isNull(keysBaseTable.deleteAt)))
        .returning();
    if (row === undefined) {
        throw new KeyActionError('Die Schließung gibt es nicht (mehr).', 404);
    }
    return row;
};

export const deleteKeyType = async (id: string): Promise<KeysBaseEntry> => {
    const holdings = await listNetHoldings({ keyTypeId: id });
    if (holdings.length > 0) {
        throw new KeyActionError('Von dieser Schließung sind noch Schlüssel ausgegeben.', 409);
    }
    const [row] = await db
        .update(keysBaseTable)
        .set({ deleteAt: new Date() })
        .where(and(eq(keysBaseTable.id, id), isNull(keysBaseTable.deleteAt)))
        .returning();
    if (row === undefined) {
        throw new KeyActionError('Die Schließung gibt es nicht (mehr).', 404);
    }
    return row;
};

// ---
// Overview
// ---

export interface KeyOverviewStats {
    persons: number;
    safes: number;
    keyTypes: number;
    keysIssued: number;
    transpondersIssued: number;
    protocols: number;
}

export const getKeyOverviewStats = async (): Promise<KeyOverviewStats> => {
    const [profiles, keyTypes, holdings, protocols] = await Promise.all([
        db
            .select({ profileKind: userProfilesTable.profileKind, value: count() })
            .from(userProfilesTable)
            .where(isNull(userProfilesTable.deleteAt))
            .groupBy(userProfilesTable.profileKind),
        db.select({ value: count() }).from(keysBaseTable).where(isNull(keysBaseTable.deleteAt)),
        listNetHoldings(),
        db.select({ value: count() }).from(keyProtocolsTable).where(isNull(keyProtocolsTable.deletedAt)),
    ]);

    return {
        persons: profiles.find((row) => row.profileKind !== 'safe')?.value ?? 0,
        safes: profiles.find((row) => row.profileKind === 'safe')?.value ?? 0,
        keyTypes: keyTypes[0]?.value ?? 0,
        keysIssued: holdings.filter((holding) => holding.lineType === 'key').reduce((sum, holding) => sum + holding.quantity, 0),
        transpondersIssued: holdings.filter((holding) => holding.lineType === 'transponder').length,
        protocols: protocols[0]?.value ?? 0,
    };
};
