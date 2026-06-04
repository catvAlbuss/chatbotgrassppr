-- ============================================================
-- 004_multitenancy.sql
-- Multi-tenancy: tokens por bot, estado de conexión,
--   y conversaciones scopeadas por bot_id
-- Ejecutar desde phpMyAdmin → Importar, o via: npm run migrate
-- ============================================================

-- ─── 1. Columnas nuevas en bots ──────────────────────────────
ALTER TABLE `bots`
  ADD COLUMN IF NOT EXISTS `waba_token`        VARCHAR(500)                                   NULL,
  ADD COLUMN IF NOT EXISTS `tipo_conexion`     ENUM('gestionado','propio') NOT NULL DEFAULT 'gestionado',
  ADD COLUMN IF NOT EXISTS `estado_conexion`   ENUM('pendiente','activo','error')  NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS `webhook_configurado` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `numero_display`    VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS `nombre_verificado` VARCHAR(100) NULL;

-- ─── 2. Unicidad de phone_number_id ─────────────────────────
-- (ignorar error si ya existe la constraint)
ALTER TABLE `bots`
  ADD UNIQUE KEY IF NOT EXISTS `uniq_phone_number_id` (`phone_number_id`);

-- ─── 3. Conversaciones scopeadas por bot ────────────────────
--   Agrega bot_id y rehace la PK para que cada bot tenga
--   su propio "hilo" por número de teléfono.

-- 3a. Agregar columna bot_id (default 'default' para el bot existente)
ALTER TABLE `conversaciones`
  ADD COLUMN IF NOT EXISTS `bot_id` VARCHAR(30) NOT NULL DEFAULT 'default';

-- 3b. Rehacer PK incluyendo bot_id
--   (primero eliminar la pk simple sobre phone)
ALTER TABLE `conversaciones` DROP PRIMARY KEY;
ALTER TABLE `conversaciones` ADD PRIMARY KEY (`bot_id`, `phone`);
