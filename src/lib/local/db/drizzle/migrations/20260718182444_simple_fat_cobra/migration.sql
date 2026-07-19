PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_change` (
	`seq` integer PRIMARY KEY AUTOINCREMENT,
	`id` text NOT NULL UNIQUE,
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
INSERT INTO `__new_change`(`seq`, `id`, `entity_type`, `entity_id`, `op`, `patch`, `created_at`, `synced`, `in_flight`, `base_version`) SELECT `seq`, `id`, `entity_type`, `entity_id`, `op`, `patch`, `created_at`, `synced`, `in_flight`, `base_version` FROM `change`;--> statement-breakpoint
DROP TABLE `change`;--> statement-breakpoint
ALTER TABLE `__new_change` RENAME TO `change`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `change_id_unique`;