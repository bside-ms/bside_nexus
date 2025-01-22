import { boolean, pgTable, primaryKey, text, varchar } from 'drizzle-orm/pg-core';

export type Group = typeof groupsTable.$inferSelect;
export type Members = typeof membersTable.$inferSelect;

export const groupsTable = pgTable('groups', {
    id: varchar({ length: 255 }).primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    path: varchar({ length: 255 }).notNull(),
    groupType: varchar({ length: 255 }).notNull(),
    categoryName: varchar({ length: 255 }).notNull(),
    displayName: varchar({ length: 255 }).notNull(),
    description: text(),
    memberGroup: varchar({ length: 255 }),
    adminGroup: varchar({ length: 255 }),
    parentGroup: varchar({ length: 255 }),
});

export const membersTable = pgTable(
    'members',
    {
        userId: varchar({ length: 255 }).notNull(),
        groupId: varchar({ length: 255 })
            .notNull()
            .references(() => groupsTable.id),
        isAdmin: boolean().notNull().default(false),
    },
    (members) => ({
        primaryKey: primaryKey(members.userId, members.groupId),
    }),
);
