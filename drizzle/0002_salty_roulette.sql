CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`theme` enum('light','dark','system') NOT NULL DEFAULT 'dark',
	`language` varchar(10) NOT NULL DEFAULT 'fr',
	`notificationsEnabled` boolean NOT NULL DEFAULT true,
	`soundEnabled` boolean NOT NULL DEFAULT false,
	`emailNotifications` boolean NOT NULL DEFAULT false,
	`autoRefreshInterval` int NOT NULL DEFAULT 5000,
	`compactMode` boolean NOT NULL DEFAULT false,
	`keyboardShortcutsEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_preferences_userId_unique` UNIQUE(`userId`)
);
