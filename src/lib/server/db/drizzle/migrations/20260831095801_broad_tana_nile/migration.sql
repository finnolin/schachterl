CREATE TYPE "change_operation" AS ENUM('create', 'update', 'delete');--> statement-breakpoint
CREATE TYPE "space_roles" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "user_roles" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"issuer" text,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"access_token_expires" timestamp with time zone,
	"refresh_token" text,
	"refresh_token_expires" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password_hash" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"seq" integer GENERATED ALWAYS AS IDENTITY (sequence name "change_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"space_id" uuid,
	"target_user_id" uuid,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"op" "change_operation" NOT NULL,
	"patch" jsonb,
	"user_id" uuid,
	"client_id" uuid NOT NULL,
	"created_at" timestamp with time zone,
	"base_version" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"file_path" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "relationship" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"relationship_type" uuid,
	"from_resource" uuid,
	"to_resource" uuid,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "relationship_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"key" text NOT NULL UNIQUE,
	"forward_label" text NOT NULL,
	"reverse_label" text NOT NULL,
	"symmetric" boolean DEFAULT false NOT NULL,
	"from_type" uuid,
	"to_type" uuid,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "resource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"parent_id" uuid,
	"sort_order" text NOT NULL,
	"name" text DEFAULT 'New Resource' NOT NULL,
	"type" uuid,
	"content" text,
	"url" text,
	"image" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"key" text NOT NULL UNIQUE,
	"singular" text NOT NULL,
	"plural" text NOT NULL,
	"icon" text,
	"description" text,
	"field_config" jsonb,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"client_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "space" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text DEFAULT 'New Space' NOT NULL,
	"icon" text,
	"default_resource_type" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "space_resource_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"resource_type_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "space_resource_type_space_resource_type_uq" UNIQUE("space_id","resource_type_id")
);
--> statement-breakpoint
CREATE TABLE "space_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"space_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "space_roles" DEFAULT 'viewer'::"space_roles" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "space_user_space_user_uq" UNIQUE("space_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean,
	"image" text,
	"role" "user_roles" DEFAULT 'user'::"user_roles" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"last_login" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" serial PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rel_from_idx" ON "relationship" ("from_resource");--> statement-breakpoint
CREATE INDEX "rel_to_idx" ON "relationship" ("to_resource");--> statement-breakpoint
CREATE INDEX "rel_type_idx" ON "relationship" ("relationship_type");--> statement-breakpoint
CREATE INDEX "resource_space_id_idx" ON "resource" ("space_id");--> statement-breakpoint
CREATE INDEX "resource_parent_sort_idx" ON "resource" ("parent_id","sort_order");--> statement-breakpoint
CREATE INDEX "space_resource_type_resource_type_id_idx" ON "space_resource_type" ("resource_type_id");--> statement-breakpoint
CREATE INDEX "space_user_user_id_idx" ON "space_user" ("user_id");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "change" ADD CONSTRAINT "change_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_space_id_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "space"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "relationship" ADD CONSTRAINT "relationship_space_id_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "space"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "relationship" ADD CONSTRAINT "relationship_relationship_type_relationship_type_id_fkey" FOREIGN KEY ("relationship_type") REFERENCES "relationship_type"("id");--> statement-breakpoint
ALTER TABLE "relationship" ADD CONSTRAINT "relationship_from_resource_resource_id_fkey" FOREIGN KEY ("from_resource") REFERENCES "resource"("id");--> statement-breakpoint
ALTER TABLE "relationship" ADD CONSTRAINT "relationship_to_resource_resource_id_fkey" FOREIGN KEY ("to_resource") REFERENCES "resource"("id");--> statement-breakpoint
ALTER TABLE "relationship_type" ADD CONSTRAINT "relationship_type_from_type_resource_type_id_fkey" FOREIGN KEY ("from_type") REFERENCES "resource_type"("id");--> statement-breakpoint
ALTER TABLE "relationship_type" ADD CONSTRAINT "relationship_type_to_type_resource_type_id_fkey" FOREIGN KEY ("to_type") REFERENCES "resource_type"("id");--> statement-breakpoint
ALTER TABLE "resource" ADD CONSTRAINT "resource_space_id_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "space"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "resource" ADD CONSTRAINT "resource_parent_id_resource_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "resource"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "resource" ADD CONSTRAINT "resource_type_resource_type_id_fkey" FOREIGN KEY ("type") REFERENCES "resource_type"("id");--> statement-breakpoint
ALTER TABLE "resource" ADD CONSTRAINT "resource_image_media_id_fkey" FOREIGN KEY ("image") REFERENCES "media"("id");--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "space" ADD CONSTRAINT "space_default_resource_type_resource_type_id_fkey" FOREIGN KEY ("default_resource_type") REFERENCES "resource_type"("id");--> statement-breakpoint
ALTER TABLE "space" ADD CONSTRAINT "space_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "space_resource_type" ADD CONSTRAINT "space_resource_type_space_id_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "space"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "space_resource_type" ADD CONSTRAINT "space_resource_type_resource_type_id_resource_type_id_fkey" FOREIGN KEY ("resource_type_id") REFERENCES "resource_type"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "space_user" ADD CONSTRAINT "space_user_space_id_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "space"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "space_user" ADD CONSTRAINT "space_user_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;