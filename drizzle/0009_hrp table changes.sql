CREATE TABLE "hrp_absences" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"contractId" varchar(36) NOT NULL,
	"type" varchar(50) NOT NULL,
	"date" date NOT NULL,
	"hours_value" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrp_contracts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"employerGroupId" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"weeklyHours" real DEFAULT 0,
	"vacationDaysPerYear" integer DEFAULT 0,
	"working_days" json DEFAULT '[1,2,3,4,5]'::json,
	"valid_from" timestamp NOT NULL,
	"valid_to" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrp_daily_record" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"contractId" varchar(36),
	"date" date NOT NULL,
	"dayType" varchar(50) DEFAULT 'work',
	"total_work_hours" numeric(10, 2) DEFAULT '0.00',
	"total_break_hours" numeric(10, 2) DEFAULT '0.00',
	"hasErrors" boolean DEFAULT false,
	"errorDetails" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hrp_leave_accounts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"contractId" varchar(36) NOT NULL,
	"year" integer NOT NULL,
	"totalVacationDays" real DEFAULT 0 NOT NULL,
	"remainingDaysFromLastYear" real DEFAULT 0,
	"overtime_carryover" numeric(10, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hrp_payroll_fixed" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"contractId" varchar(36) NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"target_hours" numeric(10, 2) DEFAULT '0.00',
	"actual_work_hours" numeric(10, 2) DEFAULT '0.00',
	"approved_overtime" numeric(10, 2) DEFAULT '0.00',
	"credited_hours" numeric(10, 2) DEFAULT '0.00',
	"status" varchar(50) DEFAULT 'open',
	"finalized_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hrp_payroll_hourly" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"contractId" varchar(36) NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"recorded_hours" numeric(10, 2) DEFAULT '0.00',
	"forecasted_hours" numeric(10, 2) DEFAULT '0.00',
	"correction_prev_month" numeric(10, 2) DEFAULT '0.00',
	"final_payout_hours" numeric(10, 2) DEFAULT '0.00',
	"status" varchar(50) DEFAULT 'open',
	"finalized_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "hrp_event_log" ADD COLUMN "contractId" varchar(36);--> statement-breakpoint
ALTER TABLE "hrp_event_log" ADD COLUMN "abgerechnet" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hrp_event_log" ADD COLUMN "deletedBy" varchar(255);--> statement-breakpoint
ALTER TABLE "hrp_event_log" ADD COLUMN "deletionReason" text;--> statement-breakpoint
ALTER TABLE "hrp_absences" ADD CONSTRAINT "hrp_absences_contractId_hrp_contracts_id_fk" FOREIGN KEY ("contractId") REFERENCES "public"."hrp_contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrp_contracts" ADD CONSTRAINT "hrp_contracts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrp_contracts" ADD CONSTRAINT "hrp_contracts_employerGroupId_groups_id_fk" FOREIGN KEY ("employerGroupId") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrp_daily_record" ADD CONSTRAINT "hrp_daily_record_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrp_daily_record" ADD CONSTRAINT "hrp_daily_record_contractId_hrp_contracts_id_fk" FOREIGN KEY ("contractId") REFERENCES "public"."hrp_contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrp_leave_accounts" ADD CONSTRAINT "hrp_leave_accounts_contractId_hrp_contracts_id_fk" FOREIGN KEY ("contractId") REFERENCES "public"."hrp_contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrp_payroll_fixed" ADD CONSTRAINT "hrp_payroll_fixed_contractId_hrp_contracts_id_fk" FOREIGN KEY ("contractId") REFERENCES "public"."hrp_contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrp_payroll_hourly" ADD CONSTRAINT "hrp_payroll_hourly_contractId_hrp_contracts_id_fk" FOREIGN KEY ("contractId") REFERENCES "public"."hrp_contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_record_idx" ON "hrp_daily_record" USING btree ("userId","date","contractId");--> statement-breakpoint
CREATE UNIQUE INDEX "leave_acc_idx" ON "hrp_leave_accounts" USING btree ("contractId","year");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_fixed_idx" ON "hrp_payroll_fixed" USING btree ("contractId","year","month");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_hourly_idx" ON "hrp_payroll_hourly" USING btree ("contractId","year","month");--> statement-breakpoint
ALTER TABLE "hrp_event_log" ADD CONSTRAINT "hrp_event_log_contractId_hrp_contracts_id_fk" FOREIGN KEY ("contractId") REFERENCES "public"."hrp_contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrp_event_log" ADD CONSTRAINT "hrp_event_log_deletedBy_users_id_fk" FOREIGN KEY ("deletedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;