CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `change` (
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
CREATE TABLE `__drizzle_migrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`hash` text NOT NULL,
	`tag` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY,
	`space_id` text NOT NULL,
	`file_path` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`created_at` integer,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_media_space_id_space_id_fk` FOREIGN KEY (`space_id`) REFERENCES `space`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `relationship` (
	`id` text PRIMARY KEY,
	`space_id` text NOT NULL,
	`relationship_type` text,
	`from_resource` text,
	`to_resource` text,
	`created_at` integer,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_relationship_space_id_space_id_fk` FOREIGN KEY (`space_id`) REFERENCES `space`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_relationship_relationship_type_relationship_type_id_fk` FOREIGN KEY (`relationship_type`) REFERENCES `relationship_type`(`id`),
	CONSTRAINT `fk_relationship_from_resource_resource_id_fk` FOREIGN KEY (`from_resource`) REFERENCES `resource`(`id`),
	CONSTRAINT `fk_relationship_to_resource_resource_id_fk` FOREIGN KEY (`to_resource`) REFERENCES `resource`(`id`)
);
--> statement-breakpoint
CREATE TABLE `relationship_type` (
	`id` text PRIMARY KEY,
	`key` text NOT NULL UNIQUE,
	`forward_label` text NOT NULL,
	`reverse_label` text NOT NULL,
	`symmetric` integer DEFAULT false NOT NULL,
	`from_type` text,
	`to_type` text,
	`created_at` integer,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_relationship_type_from_type_resource_type_id_fk` FOREIGN KEY (`from_type`) REFERENCES `resource_type`(`id`),
	CONSTRAINT `fk_relationship_type_to_type_resource_type_id_fk` FOREIGN KEY (`to_type`) REFERENCES `resource_type`(`id`)
);
--> statement-breakpoint
CREATE TABLE `resource` (
	`id` text PRIMARY KEY,
	`space_id` text NOT NULL,
	`parent_id` text,
	`sort_order` text NOT NULL,
	`name` text DEFAULT 'New Resource' NOT NULL,
	`type` text,
	`content` text,
	`url` text,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`version` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `fk_resource_space_id_space_id_fk` FOREIGN KEY (`space_id`) REFERENCES `space`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_resource_parent_id_resource_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `resource`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_resource_type_resource_type_id_fk` FOREIGN KEY (`type`) REFERENCES `resource_type`(`id`),
	CONSTRAINT `fk_resource_image_media_id_fk` FOREIGN KEY (`image`) REFERENCES `media`(`id`)
);
--> statement-breakpoint
CREATE TABLE `resource_type` (
	`id` text PRIMARY KEY,
	`key` text NOT NULL UNIQUE,
	`singular` text NOT NULL,
	`plural` text NOT NULL,
	`icon` text,
	`description` text,
	`field_config` text,
	`created_at` integer,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `space` (
	`id` text PRIMARY KEY,
	`name` text DEFAULT 'New Space' NOT NULL,
	`icon` text,
	`default_resource_type` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_space_default_resource_type_resource_type_id_fk` FOREIGN KEY (`default_resource_type`) REFERENCES `resource_type`(`id`)
);
--> statement-breakpoint
CREATE TABLE `space_resource_type` (
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
CREATE TABLE `space_user` (
	`id` text PRIMARY KEY,
	`space_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_space_user_space_id_space_id_fk` FOREIGN KEY (`space_id`) REFERENCES `space`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_space_user_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `space_user_space_user_uq` UNIQUE(`space_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `rel_from_idx` ON `relationship` (`from_resource`);--> statement-breakpoint
CREATE INDEX `rel_to_idx` ON `relationship` (`to_resource`);--> statement-breakpoint
CREATE INDEX `rel_type_idx` ON `relationship` (`relationship_type`);--> statement-breakpoint
CREATE INDEX `resource_space_id_idx` ON `resource` (`space_id`);--> statement-breakpoint
CREATE INDEX `resource_parent_sort_idx` ON `resource` (`parent_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `space_recource_type_idx` ON `space_resource_type` (`resource_type_id`);--> statement-breakpoint
CREATE INDEX `space_user_user_id_idx` ON `space_user` (`user_id`);