ALTER TABLE "space_user" ADD COLUMN "id" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "space_user" DROP CONSTRAINT "space_user_pkey";--> statement-breakpoint
ALTER TABLE "space_user" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "space_user" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "space_user" ADD CONSTRAINT "space_user_space_user_uq" UNIQUE("space_id","user_id");