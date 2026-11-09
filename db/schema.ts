import {
    boolean,
    date,
    decimal,
    index,
    integer,
    json,
    pgTable,
    primaryKey,
    real,
    text,
    timestamp,
    uniqueIndex,
    varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm/sql';

// General
export type Group = typeof groupsTable.$inferSelect;
export type User = typeof usersTable.$inferSelect;
export type MemberEntry = typeof membersTable.$inferSelect;
export type LogEntry = typeof logsTable.$inferSelect;

// Arbeitszeiterfassung
export type HrpEventLogEntry = typeof hrpEventLogTable.$inferSelect;
export type HrpContractEntry = typeof hrpContractsTable.$inferSelect;
export type HrpYearlyEntry = typeof hrpLeaveAccountsTable.$inferSelect;
export type HrpAbsenceEntry = typeof hrpAbsencesTable.$inferSelect;
export type HrpDailyEntry = typeof hrpDailyRecordTable.$inferSelect;
export type HrpMonthlyPayrollEntry = typeof hrpPayrollHourlyTable.$inferSelect;
export type HrpMonthlyFixedEntry = typeof hrpPayrollFixedTable.$inferSelect;
export type HrpPublicHolidayEntry = typeof hrpPublicHolidaysTable.$inferSelect;
export type HrpHolidayConfigEntry = typeof hrpHolidayConfigsTable.$inferSelect;
export type HrpPayrollHourlyForecastEntry = typeof hrpPayrollHourlyForecastsTable.$inferSelect;

// Schlüsselverwaltung
export type UserProfileEntry = typeof userProfilesTable.$inferSelect;
export type KeysBaseEntry = typeof keysBaseTable.$inferSelect;
export type KeyProtocolEntry = typeof keyProtocolsTable.$inferSelect;
export type KeyProtocolItemEntry = typeof keyProtocolItemsTable.$inferSelect;
export type KeyProtocolFileEntry = typeof keyProtocolFilesTable.$inferSelect;

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
    parentAdminsManage: boolean().notNull().default(false),
    hidden: boolean().notNull().default(false),
    status: varchar({ length: 50 }).notNull().default('active'),
    includedGroups: varchar({ length: 255 })
        .array()
        .notNull()
        .default(sql`'{}'`),
    deletedAt: timestamp(),
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
        // Sequential profile number for receipts
        // BY DEFAULT, so the import can keep the numbers of the old receipts.
        profileNumber: integer().generatedByDefaultAsIdentity(),
        // 'person' or 'safe' (key safe). Safes keep their name in firstName and their location in description.
        profileKind: varchar('profile_kind', { length: 20 }).notNull().default('person'),
        firstName: varchar({ length: 255 }).notNull(),
        lastName: varchar({ length: 255 }),
        addressStreet: varchar({ length: 255 }),
        addressHouseNumber: varchar({ length: 50 }),
        addressZipCode: varchar({ length: 20 }),
        addressCity: varchar({ length: 255 }),
        phoneNumber: varchar({ length: 50 }),
        emailAddress: varchar({ length: 255 }),
        description: text(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at'),
        deleteAt: timestamp('delete_at'),
        createdBy: varchar({ length: 255 }).references(() => usersTable.id, { onDelete: 'set null' }),
    },
    (table) => {
        return {
            // All versions of a user's profile
            userProfileVersionsIdx: index('user_profiles_user_id_version_created_at_idx').on(table.userId, table.createdAt),

            // Only one active version (unique only if userId is set).
            currentUserProfileIdx: uniqueIndex('user_profiles_user_id_current_unique_idx')
                .on(table.userId)
                .where(sql`${table.updatedAt} IS NULL AND ${table.deleteAt} IS NULL AND ${table.userId} IS NOT NULL`),

            // Unique sequential profile number
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

// ==========================================
// Schlüsselverwaltung
// ==========================================

export const keysBaseTable = pgTable(
    'key_types',
    {
        id: varchar({ length: 36 }).primaryKey(),
        keyNr: integer().notNull(), // e.g. 1 or 58
        keyDescription: text().notNull(),
        // All keys of this key type, issued ones included. null = unknown.
        // Single copies are not tracked, the keys carry no sub-numbers.
        totalQuantity: integer(),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        updatedAt: timestamp('updated_at'),
        deleteAt: timestamp('delete_at'),
        createdBy: varchar('created_by', { length: 255 }).references(() => usersTable.id, { onDelete: 'set null' }),
    },
    (table) => {
        return {
            // Every key type that is not deleted has a unique number
            keyNrUniqueIdx: uniqueIndex('key_types_key_nr_unique_idx')
                .on(table.keyNr)
                .where(sql`${table.deleteAt} IS NULL`),
        };
    },
);

// Recipient data at the time of the protocol. Later profile changes don't change old receipts.
export interface KeyProtocolRecipient {
    name: string;
    profileNumber: number | null;
    address: string;
    mail: string;
    phone: string;
}

// Issuance, return or loss. At most 4 lines per receipt (template).
export const keyProtocolsTable = pgTable(
    'key_protocols',
    {
        id: varchar({ length: 36 }).primaryKey(),
        // Readable number, e.g. "0231". Imported duplicates of old receipts get a letter ("0062a").
        protocolNumber: varchar('protocol_number', { length: 20 }).notNull(),
        protocolType: varchar('protocol_type', { length: 20 }).notNull(), // 'issuance' | 'return' | 'lost'
        userProfileId: varchar('user_profile_id', { length: 255 })
            .notNull()
            .references(() => userProfilesTable.id, { onDelete: 'restrict' }),
        // null = date unknown (old paper receipts)
        protocolDate: date('protocol_date', { mode: 'string' }),
        issuerName: varchar('issuer_name', { length: 255 }),
        recipient: json().$type<KeyProtocolRecipient>().notNull(),
        comment: text(),
        // File name of the original receipt (import)
        sourceFile: varchar('source_file', { length: 255 }),
        createdAt: timestamp('created_at').defaultNow().notNull(),
        createdBy: varchar('created_by', { length: 255 }).references(() => usersTable.id, { onDelete: 'set null' }),
        // Marked invalid: 'cancelled' (created by mistake) or 'destroyed' (paper receipt destroyed or void).
        // Either way it no longer counts for the stock.
        deletedAt: timestamp('deleted_at'),
        deletionKind: varchar('deletion_kind', { length: 20 }),
        deletedBy: varchar('deleted_by', { length: 255 }).references(() => usersTable.id, { onDelete: 'set null' }),
        deletionReason: text('deletion_reason'),
    },
    (table) => ({
        protocolNumberUniqueIdx: uniqueIndex('key_protocols_protocol_number_unique_idx').on(table.protocolNumber),
        userProfileIdx: index('key_protocols_user_profile_idx').on(table.userProfileId),
    }),
);

// One line of a receipt: key type + quantity, or a transponder.
// Transponders are managed in wAppLoxx and are only listed here for the receipt.
export const keyProtocolItemsTable = pgTable(
    'key_protocol_items',
    {
        id: varchar({ length: 36 }).primaryKey(),
        protocolId: varchar('protocol_id', { length: 36 })
            .notNull()
            .references(() => keyProtocolsTable.id, { onDelete: 'cascade' }),
        position: integer().notNull(),
        lineType: varchar('line_type', { length: 20 }).notNull(), // 'key' | 'transponder'
        keyTypeId: varchar('key_type_id', { length: 36 }).references(() => keysBaseTable.id, { onDelete: 'restrict' }),
        quantity: integer().notNull(),
        transponderSerial: varchar('transponder_serial', { length: 50 }),
        // Text on the receipt ("Veranstaltungstechnik", "Transponder (grün)")
        description: varchar({ length: 255 }),
        // Returns and losses: the issuance this line refers to
        issuanceProtocolId: varchar('issuance_protocol_id', { length: 36 }).references(() => keyProtocolsTable.id, {
            onDelete: 'restrict',
        }),
    },
    (table) => ({
        protocolIdx: index('key_protocol_items_protocol_idx').on(table.protocolId),
        keyTypeIdx: index('key_protocol_items_key_type_idx').on(table.keyTypeId),
        transponderIdx: index('key_protocol_items_transponder_idx').on(table.transponderSerial),
    }),
);

// Signed scans of a receipt, stored in Nextcloud. Files are never overwritten or deleted there.
export const keyProtocolFilesTable = pgTable(
    'key_protocol_files',
    {
        id: varchar({ length: 36 }).primaryKey(),
        protocolId: varchar('protocol_id', { length: 36 })
            .notNull()
            .references(() => keyProtocolsTable.id, { onDelete: 'restrict' }),
        // Path below the configured Nextcloud folder, e.g. "Ausgabe/0231 - Kai Brüske.pdf"
        filePath: text('file_path').notNull(),
        originalName: varchar('original_name', { length: 255 }),
        contentType: varchar('content_type', { length: 100 }).notNull(),
        size: integer().notNull(),
        uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
        uploadedBy: varchar('uploaded_by', { length: 255 }).references(() => usersTable.id, { onDelete: 'set null' }),
    },
    (table) => ({
        protocolIdx: index('key_protocol_files_protocol_idx').on(table.protocolId),
    }),
);

// ==========================================
// Arbeitszeiterfassung
// ==========================================

export const hrpContractsTable = pgTable('hrp_contracts', {
    id: varchar({ length: 36 }).primaryKey(),
    userId: varchar('userId', { length: 255 })
        .notNull()
        .references(() => usersTable.id),
    employerGroupId: varchar({ length: 255 })
        .notNull()
        .references(() => groupsTable.id),

    type: varchar({ length: 50 }).notNull(), // fixed_salary, hourly

    weeklyHours: real().default(0),
    vacationDaysPerYear: integer().default(0),
    hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }).default('0.00'),

    workingDays: json('working_days').$type<Array<number>>().default([1, 2, 3, 4, 5]), // [1, 2, 3, 4, 5] für Mo-Fr.

    validFrom: timestamp('valid_from').notNull(),
    validTo: timestamp('valid_to'), // null = unbefristet

    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const hrpEventLogTable = pgTable('hrp_event_log', {
    id: varchar({ length: 36 }).primaryKey(),
    userId: varchar({ length: 255 })
        .notNull()
        .references(() => usersTable.id),
    contractId: varchar({ length: 36 }).references(() => hrpContractsTable.id),
    ipAddress: varchar({ length: 255 }).notNull(),
    entryType: varchar({ length: 255 }).notNull(), // start, stop, pause, pause_end
    eventType: varchar({ length: 255 }).notNull(), // quick, advanced
    loggedTimestamp: timestamp().notNull(),
    comment: varchar({ length: 500 }),
    approvedBy: varchar({ length: 255 }).references(() => usersTable.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    approvedAt: timestamp('approved_at'),
    deletedAt: timestamp('deleted_at'),
    abgerechnet: boolean().default(false).notNull(),
    abgerechnet_date: timestamp('abgerechnet_date'),
    deletedBy: varchar('deletedBy', { length: 255 }).references(() => usersTable.id),
    deletionReason: text('deletionReason'),
});

// Jahreskonten (Urlaub & Überstunden-Übertrag)
export const hrpLeaveAccountsTable = pgTable(
    'hrp_leave_accounts',
    {
        id: varchar({ length: 36 }).primaryKey(),
        contractId: varchar({ length: 36 })
            .notNull()
            .references(() => hrpContractsTable.id),
        year: integer().notNull(),

        totalVacationDays: real().notNull().default(0),
        remainingDaysFromLastYear: real().default(0),

        overtimeCarryoverHours: decimal('overtime_carryover', { precision: 10, scale: 2 }).default('0.00'), // Überstunden-Startsaldo aus Vorjahr

        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => ({
        uniqueYearContract: uniqueIndex('leave_acc_idx').on(table.contractId, table.year),
    }),
);

// Abwesenheiten (Krank/Urlaub)
export const hrpAbsencesTable = pgTable('hrp_absences', {
    id: varchar({ length: 36 }).primaryKey(),
    contractId: varchar({ length: 36 })
        .notNull()
        .references(() => hrpContractsTable.id),

    type: varchar({ length: 50 }).notNull(), // 'vacation', 'sick', 'sick_with', 'holiday'
    date: date('date').notNull(), // YYYY-MM-DD

    hoursValue: decimal('hours_value', { precision: 10, scale: 2 }).notNull().default('0.00'),
    status: varchar({ length: 50 }).default('approved'), // 'approved', 'declined'
    abgerechnet_date: timestamp('abgerechnet_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
    deletedBy: varchar('deletedBy', { length: 255 }).references(() => usersTable.id),
    deletionReason: text('deletionReason'),
});

// Tägliche Aggregation - Wird per Script gefüllt, sobald ein Tag "fertig" ist
export const hrpDailyRecordTable = pgTable(
    'hrp_daily_record',
    {
        id: varchar({ length: 36 }).primaryKey(),
        userId: varchar({ length: 255 })
            .notNull()
            .references(() => usersTable.id),
        contractId: varchar({ length: 36 }).references(() => hrpContractsTable.id),

        date: date('date').notNull(), // Logischer Arbeitstag (Zeitpunkt des Beginns der Schicht)

        dayType: varchar({ length: 50 }).default('work'), // 'work', 'sick', 'vacation'

        totalWorkHours: decimal('total_work_hours', { precision: 10, scale: 6 }).default('0.00'),
        totalBreakHours: decimal('total_break_hours', { precision: 10, scale: 6 }).default('0.00'),

        hasErrors: boolean().default(false),
        errorDetails: text(),

        updatedAt: timestamp('updated_at').defaultNow(),
    },
    (table) => ({
        uniqueDay: uniqueIndex('daily_record_idx').on(table.userId, table.date, table.contractId),
    }),
);

// ==========================================
// 3. ABRECHNUNG (MONATSABSCHLUSS)
// ==========================================

// Für Stundenlöhner (Gastro) - Logik: 23. bis 22.
export const hrpPayrollHourlyTable = pgTable(
    'hrp_payroll_hourly',
    {
        id: varchar({ length: 36 }).primaryKey(),
        contractId: varchar({ length: 36 })
            .notNull()
            .references(() => hrpContractsTable.id),

        year: integer().notNull(),
        month: integer().notNull(),

        // Summe der "echten" Logs, die in diesem Lauf auf 'abgerechnet=true' gesetzt werden
        recordedHours: decimal('recorded_hours', { precision: 10, scale: 2 }).default('0.00'),

        // Prognose für Restmonat (Manuelle Eingabe)
        forecastedHoursLateMonth: decimal('forecasted_hours', { precision: 10, scale: 2 }).default('0.00'),

        // Automatische Korrektur aus Vormonat
        correctionFromPrevMonth: decimal('correction_prev_month', { precision: 10, scale: 2 }).default('0.00'),

        finalPayoutHours: decimal('final_payout_hours', { precision: 10, scale: 2 }).default('0.00'),

        status: varchar({ length: 50 }).default('open'),
        finalizedAt: timestamp('finalized_at'),
    },
    (table) => ({
        uniqueIdx: uniqueIndex('payroll_hourly_idx').on(table.contractId, table.year, table.month),
    }),
);

// Für Festangestellte - Logik: Kalendermonat + Zeitkonto
export const hrpPayrollFixedTable = pgTable(
    'hrp_payroll_fixed',
    {
        id: varchar({ length: 36 }).primaryKey(),
        contractId: varchar({ length: 36 })
            .notNull()
            .references(() => hrpContractsTable.id),

        year: integer().notNull(),
        month: integer().notNull(),

        targetHours: decimal('target_hours', { precision: 10, scale: 2 }).default('0.00'),
        actualWorkHours: decimal('actual_work_hours', { precision: 10, scale: 2 }).default('0.00'),

        approvedOvertime: decimal('approved_overtime', { precision: 10, scale: 2 }).default('0.00'),

        // Ergebnis nach Kappung
        creditedHours: decimal('credited_hours', { precision: 10, scale: 2 }).default('0.00'),

        status: varchar({ length: 50 }).default('open'),
        finalizedAt: timestamp('finalized_at'),
    },
    (table) => ({
        uniqueIdx: uniqueIndex('payroll_fixed_idx').on(table.contractId, table.year, table.month),
    }),
);

export const hrpPublicHolidaysTable = pgTable(
    'hrp_public_holidays',
    {
        id: varchar({ length: 36 }).primaryKey(),
        date: date('date').notNull(),
        name: varchar({ length: 255 }).notNull(),
        year: integer().notNull(),
    },
    (table) => ({
        yearIdx: index('holiday_year_idx').on(table.year),
    }),
);

export const hrpHolidayConfigsTable = pgTable(
    'hrp_holiday_configs',
    {
        id: varchar({ length: 36 }).primaryKey(),
        contractId: varchar({ length: 36 })
            .notNull()
            .references(() => hrpContractsTable.id),
        date: date('date').notNull(),
        // Strategie: 'off' (frei), 'credited' (gutgeschrieben), 'work_required' (arbeit angeordnet)
        strategy: varchar({ length: 50 }).notNull().default('off'),
        // Status: 'open', 'taken', 'expired', 'none'
        status: varchar({ length: 50 }).notNull().default('none'),
        compensatoryAbsenceId: varchar({ length: 36 }).references(() => hrpAbsencesTable.id),
        comment: text('comment'),
        createdAt: timestamp('created_at').defaultNow().notNull(),
    },
    (table) => ({
        uniqueDateContract: uniqueIndex('holiday_config_idx').on(table.contractId, table.date),
    }),
);

export const hrpPayrollHourlyForecastsTable = pgTable(
    'hrp_payroll_hourly_forecasts',
    {
        id: varchar({ length: 36 }).primaryKey(),
        contractId: varchar({ length: 36 })
            .notNull()
            .references(() => hrpContractsTable.id),
        year: integer().notNull(),
        month: integer().notNull(),
        forecastedHours: decimal('forecasted_hours', { precision: 10, scale: 2 }).default('0.00'),
    },
    (table) => ({
        uniqueIdx: uniqueIndex('payroll_hourly_forecast_idx').on(table.contractId, table.year, table.month),
    }),
);
