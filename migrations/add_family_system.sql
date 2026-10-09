-- Система семей (кланов), создаваемых игроками
-- Применять вручную через HeidiSQL / phpMyAdmin к базе сервера

-- Семьи
CREATE TABLE IF NOT EXISTS `families` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(32) NOT NULL,
  `tag` VARCHAR(5) NOT NULL,
  `leaderId` INT(11) NOT NULL,
  `cash` INT(11) NOT NULL DEFAULT 0,
  `level` INT(11) NOT NULL DEFAULT 1,
  `exp` INT(11) NOT NULL DEFAULT 0,
  `blip` INT(11) NOT NULL DEFAULT 84,
  `blipColor` INT(11) NOT NULL DEFAULT 1,
  `houseId` INT(11) DEFAULT NULL,
  `x` FLOAT DEFAULT NULL,
  `y` FLOAT DEFAULT NULL,
  `z` FLOAT DEFAULT NULL,
  `h` FLOAT DEFAULT NULL,
  `d` INT(11) DEFAULT NULL,
  `inviteRank` INT(11) NOT NULL DEFAULT 3,
  `uvalRank` INT(11) NOT NULL DEFAULT 4,
  `giveRankRank` INT(11) NOT NULL DEFAULT 4,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `tag` (`tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Ранги семьи
CREATE TABLE IF NOT EXISTS `familyranks` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `familyId` INT(11) NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `rank` INT(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `familyId` (`familyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Лог действий семьи
CREATE TABLE IF NOT EXISTS `familylogs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `familyId` INT(11) NOT NULL,
  `characterId` INT(11) NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `data` TEXT,
  `createdAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `familyId` (`familyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Склад семьи (предметы)
CREATE TABLE IF NOT EXISTS `familyinventories` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `familyId` INT(11) NOT NULL,
  `itemId` INT(11) NOT NULL,
  `pocketIndex` INT(11) DEFAULT NULL,
  `index` INT(11) NOT NULL,
  `parentId` INT(11) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  `deletedAt` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `familyId` (`familyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Параметры предметов склада семьи
CREATE TABLE IF NOT EXISTS `familyinventoryparams` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(255) NOT NULL,
  `value` TEXT NOT NULL,
  `itemId` INT(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `itemId` (`itemId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Членство персонажа в семье
ALTER TABLE `characters`
  ADD COLUMN `familyId` INT(11) DEFAULT NULL,
  ADD COLUMN `familyRank` INT(11) DEFAULT NULL;
