-- ============================================================
-- 002_bots.sql - Tabla multi-bot + fix estado reservas
-- Ejecutar desde phpMyAdmin → Importar, o via migrate.js
-- ============================================================

-- ─── TABLA: bots ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `bots` (
  `id`               VARCHAR(30)   NOT NULL PRIMARY KEY,
  `nombre`           VARCHAR(100)  NOT NULL,
  `tipo`             ENUM('grass','comercio','restaurant') NOT NULL DEFAULT 'grass',
  `phone_number_id`  VARCHAR(60),
  `admin_phone`      VARCHAR(25),
  `config`           JSON,
  `plan`             ENUM('demo','mensual','anual','lifetime') NOT NULL DEFAULT 'demo',
  `plan_inicio`      DATE,
  `plan_expira`      DATE,
  `activo`           TINYINT(1) NOT NULL DEFAULT 1,
  `creado_en`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `actualizado`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tipo`   (`tipo`),
  INDEX `idx_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── FIX: estado CANCELADA_SLOTS_OCUPADOS ────────────────
ALTER TABLE `reservas`
  MODIFY COLUMN `estado` ENUM(
    'PENDIENTE_PAGO',
    'COMPROBANTE_ENVIADO',
    'EN_REVISION',
    'CONFIRMADA',
    'RECHAZADA',
    'CANCELADA_TIMEOUT',
    'CANCELADA_SLOTS_OCUPADOS'
  ) NOT NULL DEFAULT 'PENDIENTE_PAGO';
