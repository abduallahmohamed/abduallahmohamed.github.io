CREATE TABLE `scholar_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`totalCitations` int NOT NULL DEFAULT 0,
	`publicationsJson` text NOT NULL,
	`fetchedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scholar_cache_id` PRIMARY KEY(`id`)
);
