ALTER TABLE "hrp_daily_record" ALTER COLUMN "total_work_hours" SET DATA TYPE numeric(10, 6);--> statement-breakpoint
ALTER TABLE "hrp_daily_record" ALTER COLUMN "total_work_hours" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "hrp_daily_record" ALTER COLUMN "total_break_hours" SET DATA TYPE numeric(10, 6);--> statement-breakpoint
ALTER TABLE "hrp_daily_record" ALTER COLUMN "total_break_hours" SET DEFAULT '0.00';