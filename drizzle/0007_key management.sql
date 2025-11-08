CREATE TABLE "key_assignment" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"keyId" varchar(255),
	"userId" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	"handoverProtocolId" integer NOT NULL,
	"returned_at" timestamp,
	"returned_by" varchar(255),
	"handbackProtocolId" integer NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "keys" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"keyNr" integer NOT NULL,
	"keyDescription" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"delete_at" timestamp,
	"created_by" varchar(255)
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "createdBy" varchar(255);--> statement-breakpoint
ALTER TABLE "key_assignment" ADD CONSTRAINT "key_assignment_keyId_keys_id_fk" FOREIGN KEY ("keyId") REFERENCES "public"."keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_assignment" ADD CONSTRAINT "key_assignment_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_assignment" ADD CONSTRAINT "key_assignment_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_assignment" ADD CONSTRAINT "key_assignment_returned_by_users_id_fk" FOREIGN KEY ("returned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_assignment" ADD CONSTRAINT "key_assignment_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keys" ADD CONSTRAINT "keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;