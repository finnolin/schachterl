CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `change` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`op` text NOT NULL,
	`patch` text,
	`created_at` integer NOT NULL,
	`synced` integer DEFAULT false NOT NULL,
	`in_flight` integer DEFAULT false NOT NULL,
	`base_version` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `change_id_unique` ON `change` (`id`);--> statement-breakpoint
CREATE TABLE `__drizzle_migrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hash` text NOT NULL,
	`tag` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resource` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`version` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer
);
