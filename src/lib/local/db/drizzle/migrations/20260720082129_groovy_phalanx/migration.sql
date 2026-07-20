ALTER TABLE `space_user` ADD `id` text;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_space_user` (
	`id` text PRIMARY KEY,
	`space_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_space_user_space_id_space_id_fk` FOREIGN KEY (`space_id`) REFERENCES `space`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_space_user_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `space_user_space_user_uq` UNIQUE(`space_id`,`user_id`)
);
--> statement-breakpoint
INSERT INTO `__new_space_user`(`space_id`, `user_id`, `role`, `created_at`, `updated_at`) SELECT `space_id`, `user_id`, `role`, `created_at`, `updated_at` FROM `space_user`;--> statement-breakpoint
DROP TABLE `space_user`;--> statement-breakpoint
ALTER TABLE `__new_space_user` RENAME TO `space_user`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `space_user_user_id_idx` ON `space_user` (`user_id`);