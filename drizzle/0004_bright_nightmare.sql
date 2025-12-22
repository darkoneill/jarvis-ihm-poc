CREATE TABLE `custom_widgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`widgetType` enum('api','chart','text','iframe','countdown') NOT NULL DEFAULT 'api',
	`config` json NOT NULL,
	`defaultSize` json,
	`icon` varchar(100),
	`color` varchar(20),
	`isPublic` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_widgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plugin_executions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pluginId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`input` json,
	`output` json,
	`status` enum('pending','running','success','error') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`duration` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plugin_executions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `themes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`displayName` varchar(255) NOT NULL,
	`description` text,
	`colors` json NOT NULL,
	`fonts` json,
	`effects` json,
	`preview` text,
	`isBuiltIn` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `themes_id` PRIMARY KEY(`id`),
	CONSTRAINT `themes_name_unique` UNIQUE(`name`)
);
