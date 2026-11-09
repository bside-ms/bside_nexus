CREATE TABLE "key_protocol_files" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"protocol_id" varchar(36) NOT NULL,
	"file_path" text NOT NULL,
	"original_name" varchar(255),
	"content_type" varchar(100) NOT NULL,
	"size" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"uploaded_by" varchar(255)
);
--> statement-breakpoint
ALTER TABLE "key_protocols" ADD COLUMN "deletion_kind" varchar(20);--> statement-breakpoint
ALTER TABLE "key_protocol_files" ADD CONSTRAINT "key_protocol_files_protocol_id_key_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."key_protocols"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "key_protocol_files" ADD CONSTRAINT "key_protocol_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "key_protocol_files_protocol_idx" ON "key_protocol_files" USING btree ("protocol_id");