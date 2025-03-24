CREATE TABLE "logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"userId" varchar(255) NOT NULL,
	"ipAddress" varchar(255) NOT NULL,
	"eventType" varchar(255) NOT NULL,
	"affectedUserId" varchar(255),
	"affectedGroupId" varchar(255),
	"description" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_affectedUserId_users_id_fk" FOREIGN KEY ("affectedUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_affectedGroupId_groups_id_fk" FOREIGN KEY ("affectedGroupId") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;