CREATE TYPE "public"."user_roles" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
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
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean,
	"image" text,
	"role" "user_roles" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"last_login" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;