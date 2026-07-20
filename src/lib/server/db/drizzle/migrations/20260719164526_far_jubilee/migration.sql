ALTER TABLE "resource" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "resource" ADD COLUMN "sort_order" text NOT NULL;--> statement-breakpoint
ALTER TABLE "resource" ADD CONSTRAINT "resource_parent_id_resource_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "resource"("id") ON DELETE CASCADE;