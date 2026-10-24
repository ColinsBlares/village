-- Миграция: добавление поля lastWheelSpin в таблицу characters
-- Используется колесом удачи в казино для кулдауна 24ч на бесплатную прокрутку
-- Применять только если поле ещё не существует

ALTER TABLE `characters`
ADD COLUMN IF NOT EXISTS `lastWheelSpin` DATETIME NULL DEFAULT NULL AFTER `inviteCompleted`;
