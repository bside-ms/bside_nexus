CREATE TABLE "hrp_public_holidays" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"name" varchar(255) NOT NULL,
	"year" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hrp_holiday_configs" ADD COLUMN "status" varchar(50) DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "hrp_holiday_configs" ADD COLUMN "compensatoryAbsenceId" varchar(36);--> statement-breakpoint
CREATE INDEX "holiday_year_idx" ON "hrp_public_holidays" USING btree ("year");--> statement-breakpoint
ALTER TABLE "hrp_holiday_configs" ADD CONSTRAINT "hrp_holiday_configs_compensatoryAbsenceId_hrp_absences_id_fk" FOREIGN KEY ("compensatoryAbsenceId") REFERENCES "public"."hrp_absences"("id") ON DELETE no action ON UPDATE no action;