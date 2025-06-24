import { boolean, index, pgTable, primaryKey, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm/sql';

export type Group = typeof groupsTable.$inferSelect;
export type User = typeof usersTable.$inferSelect;
export type UserProfile = typeof userProfilesTable.$inferSelect;
export type MemberEntry = typeof membersTable.$inferSelect;
export type LogEntry = typeof logsTable.$inferSelect;

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
        userId: varchar({ length: 255 }).references(() => usersTable.id, { onDelete: 'cascade' }),
        firstName: varchar({ length: 255 }).notNull(),
        lastName: varchar({ length: 255 }),
        addressStreet: varchar({ length: 255 }),
        addressHouseNumber: varchar({ length: 50 }),
        addressZipCode: varchar({ length: 20 }),
        addressCity: varchar({ length: 255 }),
        phoneNumber: varchar({ length: 50 }),
        emailAddress: varchar({ length: 50 }),
        description: text(),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }),
        deleteAt: timestamp('delete_at', { withTimezone: true }),
    },
    (table) => {
        return {
            // Alle Versionen einer Benutzer*in.
            userProfileVersionsIdx: index('user_profiles_user_id_version_created_at_idx').on(table.userId, table.createdAt),

            // Nur eine aktive Version.
            currentUserProfileIdx: uniqueIndex('user_profiles_user_id_current_unique_idx')
                .on(table.userId)
                .where(sql`${table.updatedAt} IS NULL AND ${table.deleteAt} IS NULL`),
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
    timestamp: timestamp()
        .default(sql`now()`)
        .notNull(),
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
