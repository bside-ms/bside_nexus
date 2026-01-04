ALTER TABLE "hrp_absences" ALTER COLUMN "status" SET DEFAULT 'approved';--> statement-breakpoint
ALTER TABLE "hrp_absences" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "hrp_absences" ADD COLUMN "deletedBy" varchar(255);--> statement-breakpoint
ALTER TABLE "hrp_absences" ADD COLUMN "deletionReason" text;--> statement-breakpoint
ALTER TABLE "hrp_absences" ADD CONSTRAINT "hrp_absences_deletedBy_users_id_fk" FOREIGN KEY ("deletedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;