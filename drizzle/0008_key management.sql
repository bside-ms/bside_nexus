CREATE TABLE "key_items" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"key_type_id" varchar(36) NOT NULL,
	"seqNumber" integer NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "key_protocols" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"protocolType" varchar(50) NOT NULL,
	"user_profile_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	"signature_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "key_types" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"keyNr" integer NOT NULL,
	"keyDescription" text NOT NULL,
	"totalQuantity" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"delete_at" timestamp,
	"created_by" varchar(255)
);
--> statement-breakpoint
ALTER TABLE "keys" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "keys" CASCADE;--> statement-breakpoint
ALTER TABLE "key_assignment" DROP CONSTRAINT "key_assignment_keyId_keys_id_fk";
--> statement-breakpoint
ALTER TABLE "key_assignment" DROP CONSTRAINT "key_assignment_userId_users_id_fk";
--> statement-breakpoint
ALTER TABLE "key_assignment" DROP CONSTRAINT "key_assignment_returned_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "key_assignment" DROP CONSTRAINT "key_assignment_deleted_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_userId_users_id_fk";
--> statement-breakpoint
DROP INDEX "user_profiles_user_id_current_unique_idx";--> statement-breakpoint
ALTER TABLE "key_assignment" ADD COLUMN "key_item_id" varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE "key_assignment" ADD COLUMN "user_profile_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "key_assignment" ADD COLUMN "issuance_protocol_id" varchar(36) NOT NULL;--> statement-breakpoint
ALTER TABLE "key_assignment" ADD COLUMN "return_protocol_id" varchar(36);--> statement-breakpoint
ALTER TABLE "key_assignment" ADD COLUMN "received_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "key_assignment" ADD COLUMN "lost_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "profileNumber" integer NOT NULL GENERATED ALWAYS AS IDENTITY (sequence name "user_profiles_profileNumber_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
ALTER TABLE "key_items" ADD CONSTRAINT "key_items_key_type_id_key_types_id_fk" FOREIGN KEY ("key_type_id") REFERENCES "public"."key_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_protocols" ADD CONSTRAINT "key_protocols_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_protocols" ADD CONSTRAINT "key_protocols_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_types" ADD CONSTRAINT "key_types_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "key_items_key_type_id_seq_unique_idx" ON "key_items" USING btree ("key_type_id","seqNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "key_types_key_nr_unique_idx" ON "key_types" USING btree ("keyNr");--> statement-breakpoint
ALTER TABLE "key_assignment" ADD CONSTRAINT "key_assignment_key_item_id_key_items_id_fk" FOREIGN KEY ("key_item_id") REFERENCES "public"."key_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_assignment" ADD CONSTRAINT "key_assignment_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_assignment" ADD CONSTRAINT "key_assignment_issuance_protocol_id_key_protocols_id_fk" FOREIGN KEY ("issuance_protocol_id") REFERENCES "public"."key_protocols"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_assignment" ADD CONSTRAINT "key_assignment_return_protocol_id_key_protocols_id_fk" FOREIGN KEY ("return_protocol_id") REFERENCES "public"."key_protocols"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "key_assignment_active_unique_idx" ON "key_assignment" USING btree ("key_item_id") WHERE "key_assignment"."returned_at" IS NULL AND "key_assignment"."lost_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_profile_number_unique_idx" ON "user_profiles" USING btree ("profileNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_user_id_current_unique_idx" ON "user_profiles" USING btree ("userId") WHERE "user_profiles"."updated_at" IS NULL AND "user_profiles"."delete_at" IS NULL AND "user_profiles"."userId" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "key_assignment" DROP COLUMN "keyId";--> statement-breakpoint
ALTER TABLE "key_assignment" DROP COLUMN "userId";--> statement-breakpoint
ALTER TABLE "key_assignment" DROP COLUMN "handoverProtocolId";--> statement-breakpoint
ALTER TABLE "key_assignment" DROP COLUMN "returned_by";--> statement-breakpoint
ALTER TABLE "key_assignment" DROP COLUMN "handbackProtocolId";--> statement-breakpoint
ALTER TABLE "key_assignment" DROP COLUMN "deleted_at";--> statement-breakpoint
ALTER TABLE "key_assignment" DROP COLUMN "deleted_by";