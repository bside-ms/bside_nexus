ALTER TABLE "hrp_absences" ADD COLUMN "abgerechnet_date" timestamp;--> statement-breakpoint
ALTER TABLE "hrp_contracts" ADD COLUMN "hourly_rate" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "hrp_event_log" ADD COLUMN "abgerechnet_date" timestamp;