ALTER TABLE `space_resource_type` ADD `created_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `space_user` ADD `deleted_at` integer;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_space_resource_type` (
	`id` text PRIMARY KEY,
	`space_id` text NOT NULL,
	`resource_type_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_space_resource_type_space_id_space_id_fk` FOREIGN KEY (`space_id`) REFERENCES `space`(`id`),
	CONSTRAINT `fk_space_resource_type_resource_type_id_resource_type_id_fk` FOREIGN KEY (`resource_type_id`) REFERENCES `resource_type`(`id`),
	CONSTRAINT `space_recource_type_uq` UNIQUE(`space_id`,`resource_type_id`)
);
--> statement-breakpoint
INSERT INTO `__new_space_resource_type`(`id`, `space_id`, `resource_type_id`, `updated_at`, `deleted_at`) SELECT `id`, `space_id`, `resource_type_id`, `updated_at`, `deleted_at` FROM `space_resource_type`;--> statement-breakpoint
DROP TABLE `space_resource_type`;--> statement-breakpoint
ALTER TABLE `__new_space_resource_type` RENAME TO `space_resource_type`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `space_recource_type_idx` ON `space_resource_type` (`resource_type_id`);