CREATE TABLE `vehicleConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`features` text NOT NULL,
	`pricePerKm` int NOT NULL,
	`pricePerHour` int NOT NULL,
	`minDistance` int NOT NULL,
	`images` text NOT NULL,
	`active` enum('yes','no') NOT NULL DEFAULT 'yes',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicleConfigs_id` PRIMARY KEY(`id`),
	CONSTRAINT `vehicleConfigs_vehicleId_unique` UNIQUE(`vehicleId`)
);
--> statement-breakpoint
ALTER TABLE `quotes` ADD `clientFirstName` varchar(128);--> statement-breakpoint
ALTER TABLE `quotes` ADD `clientLastName` varchar(128);--> statement-breakpoint
ALTER TABLE `quotes` ADD `clientCompany` varchar(255);--> statement-breakpoint
ALTER TABLE `quotes` ADD `clientVatNumber` varchar(64);