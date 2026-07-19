CREATE TYPE "resource_type" AS ENUM('note');--> statement-breakpoint
ALTER TABLE "change" ADD COLUMN "client_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "resource" ADD COLUMN "id" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "resource" ADD COLUMN "type" "resource_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "resource" ADD COLUMN "created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "resource" ADD COLUMN "updated_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "resource" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "resource" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "resource" ADD PRIMARY KEY ("id");