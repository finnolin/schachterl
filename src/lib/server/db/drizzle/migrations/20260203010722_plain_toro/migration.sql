CREATE TYPE "public"."change_operation" AS ENUM('create', 'update', 'delete');--> statement-breakpoint
CREATE TABLE "change" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" integer GENERATED ALWAYS AS IDENTITY (sequence name "change_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"op" "change_operation" NOT NULL,
	"patch" jsonb,
	"user_id" uuid,
	"created_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "change" ADD CONSTRAINT "change_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;