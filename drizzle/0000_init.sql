CREATE TABLE "groups" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"path" varchar(255) NOT NULL,
	"groupType" varchar(255) NOT NULL,
	"categoryName" varchar(255) NOT NULL,
	"displayName" varchar(255) NOT NULL,
	"description" text,
	"memberGroup" varchar(255),
	"adminGroup" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "members" (
	"userId" varchar(255) NOT NULL,
	"groupId" varchar(255) NOT NULL,
	"isAdmin" boolean DEFAULT false NOT NULL,
	CONSTRAINT "members_userId_groupId_pk" PRIMARY KEY("userId","groupId")
);
--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_groupId_groups_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;