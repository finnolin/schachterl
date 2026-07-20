CREATE TYPE "space_roles" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE "space" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text DEFAULT 'New Space' NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "space_user" (
	"space_id" uuid,
	"user_id" uuid,
	"role" "space_roles" DEFAULT 'viewer'::"space_roles" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "space_user_pkey" PRIMARY KEY("space_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "resource" ADD COLUMN "name" text DEFAULT 'New Resource' NOT NULL;--> statement-breakpoint
ALTER TABLE "resource" ADD COLUMN "space_id" uuid NOT NULL;--> statement-breakpoint
CREATE INDEX "resource_space_id_idx" ON "resource" ("space_id");--> statement-breakpoint
CREATE INDEX "space_user_user_id_idx" ON "space_user" ("user_id");--> statement-breakpoint
ALTER TABLE "resource" ADD CONSTRAINT "resource_space_id_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "space"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "space_user" ADD CONSTRAINT "space_user_space_id_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "space"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "space_user" ADD CONSTRAINT "space_user_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;