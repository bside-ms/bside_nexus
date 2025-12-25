import { boolean, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm/sql';

export type Group = typeof groupsTable.$inferSelect;
export type User = typeof usersTable.$inferSelect;
export type UserProfileEntry = typeof userProfilesTable.$inferSelect;
export type MemberEntry = typeof membersTable.$inferSelect;
export type LogEntry = typeof logsTable.$inferSelect;
export type HrpEventLogEntry = typeof hrpEventLogTable.$inferSelect;
export type keysBaseEntry = typeof keysBaseTable.$inferSelect;
export type keyItemEntry = typeof keyItemsTable.$inferSelect;
export type keyProtocolEntry = typeof keyProtocolsTable.$inferSelect;
export type keyAssignmentEntry = typeof keyAssignmentTable.$inferSelect;

export const groupsTable = pgTable('groups', {
    id: varchar({ length: 255 }).primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    path: varchar({ length: 255 }).notNull(),
    groupType: varchar({ length: 255 }).notNull(),
    categoryName: varchar({ length: 255 }).notNull(),
    displayName: varchar({ length: 255 }).notNull(),
    description: text(),
    wikiLink: varchar({ length: 255 }),
    websiteLink: varchar({ length: 255 }),
    memberGroup: varchar({ length: 255 }),
    adminGroup: varchar({ length: 255 }),
    parentGroup: varchar({ length: 255 }),
});

export const usersTable = pgTable('users', {
    id: varchar({ length: 255 }).primaryKey(),
    username: varchar({ length: 255 }).notNull(),
    displayName: varchar({ length: 255 }),
    email: varchar({ length: 255 }).notNull(),
    enabled: boolean().default(false).notNull(),
});

export const userProfilesTable = pgTable(
    'user_profiles',
    {
        id: varchar({ length: 255 }).primaryKey(),
        userId: varchar({ length: 255 }).references(() => usersTable.id, { onDelete: 'set null' }),
        // Fortlaufende Profilnummer für Quittungen
        profileNumber: integer().generatedAlwaysAsIdentity(),
        firstName: varchar({ length: 255 }).notNull(),
        lastName: varchar({ length: 255 }),
        addressStreet: varchar({ length: 255 }),
        addressHouseNumber: varchar({ length: 50 }),
        addressZipCode: varchar({ length: 20 }),
        addressCity: varchar({ length: 255 }),
        phoneNumber: varchar({ length: 50 }),
        emailAddress: varchar({ length: 50 }),
        description: text(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at'),
        deleteAt: timestamp('delete_at'),
        createdBy: varchar({ length: 255 }).references(() => usersTable.id, { onDelete: 'set null' }),
    },
    (table) => {
        return {
            // Alle Versionen einer Benutzer*in
            userProfileVersionsIdx: index('user_profiles_user_id_version_created_at_idx').on(table.userId, table.createdAt),

            // Nur eine aktive Version (nur unique, wenn userId vorhanden ist).
            currentUserProfileIdx: uniqueIndex('user_profiles_user_id_current_unique_idx')
                .on(table.userId)
                .where(sql`${table.updatedAt} IS NULL AND ${table.deleteAt} IS NULL AND ${table.userId} IS NOT NULL`),

            // Eindeutige fortlaufende Profilnummer
            userProfileNumberUniqueIdx: uniqueIndex('user_profiles_profile_number_unique_idx').on(table.profileNumber),
        };
    },
);

export const membersTable = pgTable(
    'members',
    {
        userId: varchar({ length: 255 })
            .notNull()
            .references(() => usersTable.id),
        groupId: varchar({ length: 255 })
            .notNull()
            .references(() => groupsTable.id),
        isAdmin: boolean().notNull().default(false),
    },
    (members) => ({
        primaryKey: primaryKey(members.userId, members.groupId),
    }),
);

export const logsTable = pgTable('logs', {
    id: varchar({ length: 36 }).primaryKey(),
    timestamp: timestamp().defaultNow().notNull(),
    userId: varchar({ length: 255 })
        .notNull()
        .references(() => usersTable.id),
    ipAddress: varchar({ length: 255 }).notNull(),
    eventType: varchar({ length: 255 }).notNull(),
    affectedUserId: varchar({ length: 255 }).references(() => usersTable.id),
    affectedGroupId: varchar({ length: 255 }).references(() => groupsTable.id),
    // resourceType: varchar({ length: 255 }).notNull(),
    // resourceId: varchar({ length: 255 }),
    description: text().notNull().default(''),
});

export const hrpEventLogTable = pgTable('hrp_event_log', {
    id: varchar({ length: 36 }).primaryKey(),
    userId: varchar({ length: 255 })
        .notNull()
        .references(() => usersTable.id),
    ipAddress: varchar({ length: 255 }).notNull(),
    entryType: varchar({ length: 255 }).notNull(),
    eventType: varchar({ length: 255 }).notNull(),
    loggedTimestamp: timestamp().notNull(),
    comment: varchar({ length: 500 }),
    approvedBy: varchar({ length: 255 }).references(() => usersTable.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    approvedAt: timestamp('approved_at'),
    deletedAt: timestamp('deleted_at'),
    abgerechnet: boolean().default(false).notNull(),
    deletedBy: varchar({ length: 255 }).references(() => usersTable.id),
    deletionReason: text(),
});

export const keysBaseTable = pgTable(
    'key_types',
    {
        id: varchar({ length: 36 }).primaryKey(),
        keyNr: integer().notNull(), // z.B. 1 oder 58
        keyDescription: text().notNull(),
        totalQuantity: integer().default(0),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at'),
        deleteAt: timestamp('delete_at'),
        createdBy: varchar('created_by', { length: 255 }).references(() => usersTable.id, { onDelete: 'set null' }),
    },
    (table) => {
        return {
            // Jede Schließung hat eine eindeutige Nummer
            keyNrUniqueIdx: uniqueIndex('key_types_key_nr_unique_idx').on(table.keyNr),
        };
    },
);

export const keyItemsTable = pgTable(
    'key_items',
    {
        id: varchar({ length: 36 }).primaryKey(),
        keyTypeId: varchar('key_type_id', { length: 36 })
            .notNull()
            .references(() => keysBaseTable.id, { onDelete: 'restrict' }),
        seqNumber: integer().notNull(),
        status: varchar({ length: 50 }).notNull().default('active'), // 'active', 'inactive', 'lost', 'broken', 'destroyed'
        comment: text(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => {
        return {
            // Je Schließung ist die laufende Nummer eindeutig
            keyItemSeqUniqueIdx: uniqueIndex('key_items_key_type_id_seq_unique_idx').on(table.keyTypeId, table.seqNumber),
        };
    },
);

export const keyProtocolsTable = pgTable('key_protocols', {
    id: varchar({ length: 36 }).primaryKey(),
    protocolType: varchar({ length: 50 }).notNull(), // 'issuance' / 'return'
    userProfileId: varchar('user_profile_id', { length: 255 })
        .notNull()
        .references(() => userProfilesTable.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    createdBy: varchar('created_by', { length: 255 }).references(() => usersTable.id, { onDelete: 'set null' }), // Mitarbeiter, der die Quittung erstellt
    signatureDate: timestamp('signature_date'),
});

export const keyAssignmentTable = pgTable(
    'key_assignment',
    {
        id: varchar({ length: 255 }).primaryKey(),

        keyItemId: varchar('key_item_id', { length: 36 })
            .notNull()
            .references(() => keyItemsTable.id, { onDelete: 'restrict' }),

        userProfileId: varchar('user_profile_id', { length: 255 })
            .notNull()
            .references(() => userProfilesTable.id, { onDelete: 'cascade' }),

        issuanceProtocolId: varchar('issuance_protocol_id', { length: 36 })
            .notNull()
            .references(() => keyProtocolsTable.id),

        returnProtocolId: varchar('return_protocol_id', { length: 36 }).references(() => keyProtocolsTable.id),

        receivedAt: timestamp('received_at').defaultNow().notNull(), // Zeitpunkt der Ausgabe
        returnedAt: timestamp('returned_at'), // Zeitpunkt der tatsächlichen Rückgabe

        lostAt: timestamp('lost_at'),

        createdAt: timestamp('created_at').defaultNow().notNull(),
        createdBy: varchar('created_by', { length: 255 }).references(() => usersTable.id, { onDelete: 'set null' }),
    },
    (table) => {
        return {
            // Pro Schlüssel darf es nur eine aktive (nicht zurückgegebene, nicht verlorene) Zuweisung geben
            activeAssignmentUniqueIdx: uniqueIndex('key_assignment_active_unique_idx')
                .on(table.keyItemId)
                .where(sql`${table.returnedAt} IS NULL AND ${table.lostAt} IS NULL`),
        };
    },
);
