CREATE TABLE `space` (
	`id` text PRIMARY KEY,
	`name` text DEFAULT 'New Space' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `space_user` (
	`space_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `space_user_pk` PRIMARY KEY(`space_id`, `user_id`),
	CONSTRAINT `fk_space_user_space_id_space_id_fk` FOREIGN KEY (`space_id`) REFERENCES `space`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_space_user_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `resource` ADD `space_id` text NOT NULL REFERENCES space(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `resource` ADD `parent_id` text REFERENCES resource(id) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `resource` ADD `sort_order` text NOT NULL;--> statement-breakpoint
ALTER TABLE `resource` ADD `name` text DEFAULT 'New Resource' NOT NULL;--> statement-breakpoint
CREATE INDEX `resource_space_id_idx` ON `resource` (`space_id`);--> statement-breakpoint
CREATE INDEX `resource_parent_sort_idx` ON `resource` (`parent_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `space_user_user_id_idx` ON `space_user` (`user_id`);