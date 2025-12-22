CREATE TABLE `llm_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('forge','ollama','openai','anthropic','n2') NOT NULL DEFAULT 'forge',
	`apiUrl` varchar(512),
	`apiKey` varchar(512),
	`model` varchar(100),
	`temperature` int NOT NULL DEFAULT 70,
	`maxTokens` int NOT NULL DEFAULT 4096,
	`timeout` int NOT NULL DEFAULT 30000,
	`streamEnabled` boolean NOT NULL DEFAULT true,
	`fallbackEnabled` boolean NOT NULL DEFAULT true,
	`fallbackProvider` enum('forge','ollama','openai','anthropic','n2') DEFAULT 'forge',
	`lastTestedAt` timestamp,
	`lastTestStatus` enum('success','error','pending'),
	`lastTestLatency` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `llm_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `llm_configs_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text,
	`description` text,
	`category` varchar(50) NOT NULL DEFAULT 'general',
	`isSecret` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_key_unique` UNIQUE(`key`)
);
