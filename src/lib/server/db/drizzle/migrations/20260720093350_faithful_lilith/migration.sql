ALTER TABLE "change" ADD COLUMN "target_user_id" uuid;--> statement-breakpoint
ALTER TABLE "space" ADD COLUMN "created_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "change" ALTER COLUMN "entity_id" SET DATA TYPE uuid USING "entity_id"::uuid;--> statement-breakpoint
ALTER TABLE "change" ADD CONSTRAINT "change_target_user_id_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "space" ADD CONSTRAINT "space_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "change" DROP CONSTRAINT "change_space_id_space_id_fkey", ADD CONSTRAINT "change_space_id_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "space"("id") ON DELETE SET NULL;