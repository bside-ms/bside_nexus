-- Keep the stock: count the copies per key type before key_items is dropped. Key types without copies get NULL (unknown).
UPDATE "key_types" SET "totalQuantity" = (SELECT count(*) FROM "key_items" WHERE "key_items"."key_type_id" = "key_types"."id");--> statement-breakpoint
UPDATE "key_types" SET "totalQuantity" = NULL WHERE "totalQuantity" = 0;--> statement-breakpoint
DROP TABLE "key_assignment" CASCADE;--> statement-breakpoint
DROP TABLE "key_items" CASCADE;--> statement-breakpoint
DROP TABLE "key_protocols" CASCADE;
