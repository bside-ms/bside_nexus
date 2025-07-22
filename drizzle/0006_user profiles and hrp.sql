CREATE TABLE "hrp_event_log" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"ipAddress" varchar(255) NOT NULL,
	"entryType" varchar(255) NOT NULL,
	"eventType" varchar(255) NOT NULL,
	"loggedTimestamp" timestamp NOT NULL,
	"comment" varchar(500),
	"approvedBy" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255),
	"firstName" varchar(255) NOT NULL,
	"lastName" varchar(255),
	"addressStreet" varchar(255),
	"addressHouseNumber" varchar(50),
	"addressZipCode" varchar(20),
	"addressCity" varchar(255),
	"phoneNumber" varchar(50),
	"emailAddress" varchar(50),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"delete_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "hrp_event_log" ADD CONSTRAINT "hrp_event_log_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hrp_event_log" ADD CONSTRAINT "hrp_event_log_approvedBy_users_id_fk" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_profiles_user_id_version_created_at_idx" ON "user_profiles" USING btree ("userId","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_user_id_current_unique_idx" ON "user_profiles" USING btree ("userId") WHERE "user_profiles"."updated_at" IS NULL AND "user_profiles"."delete_at" IS NULL;