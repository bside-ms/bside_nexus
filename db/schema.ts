import { boolean, pgTable, primaryKey, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm/sql';

export type Group = typeof groupsTable.$inferSelect;
export type User = typeof usersTable.$inferSelect;
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
