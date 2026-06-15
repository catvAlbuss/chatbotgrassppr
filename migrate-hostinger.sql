-- ============================================================
-- migrate-hostinger.sql
-- Script para ejecutar en phpMyAdmin de Hostinger
-- Ve a: hPanel → Bases de datos → phpMyAdmin → Importar
-- ============================================================

-- ── TABLAS BASE ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `personas` (
  `id`        INT AUTO_INCREMENT PRIMARY KEY,
  `dni`       VARCHAR(8)   NOT NULL,
  `nombres`   VARCHAR(100) NOT NULL,
  `apellidos` VARCHAR(100) NOT NULL,
  `fuente`    ENUM('api','manual') NOT NULL DEFAULT 'api',
  `creado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_dni` (`dni`),
  INDEX `idx_dni` (`dni`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `conversaciones` (
  `phone`       VARCHAR(25) NOT NULL,
  `bot_id`      VARCHAR(30) NOT NULL DEFAULT 'default',
  `estado`      VARCHAR(50) NOT NULL DEFAULT 'INICIO',
  `datos`       JSON,
  `historial`   JSON,
  `actualizado` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`bot_id`, `phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reservas` (
  `id`              VARCHAR(30)  NOT NULL PRIMARY KEY,
  `phone`           VARCHAR(25)  NOT NULL,
  `bot_id`          VARCHAR(30)  NOT NULL DEFAULT 'default',
  `dni`             VARCHAR(8),
  `nombres`         VARCHAR(100),
  `apellidos`       VARCHAR(100),
  `tipo_cancha`     VARCHAR(60),
  `fecha`           DATE         NOT NULL,
  `fecha_display`   VARCHAR(20),
  `fecha_nombre`    VARCHAR(80),
  `horas`           JSON,
  `costo_total`     DECIMAL(8,2) DEFAULT 0,
  `monto_reserva`   DECIMAL(8,2) DEFAULT 0,
  `estado`          ENUM(
    'PENDIENTE_PAGO','COMPROBANTE_ENVIADO','EN_REVISION',
    'CONFIRMADA','RECHAZADA','CANCELADA_TIMEOUT','CANCELADA_SLOTS_OCUPADOS'
  ) NOT NULL DEFAULT 'PENDIENTE_PAGO',
  `numero_op`       VARCHAR(60),
  `comprobante_id`  VARCHAR(120),
  `creado_en`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_phone`  (`phone`),
  INDEX `idx_fecha`  (`fecha`),
  INDEX `idx_estado` (`estado`),
  INDEX `idx_bot`    (`bot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `slots_ocupados` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `fecha`      DATE       NOT NULL,
  `hora`       VARCHAR(5) NOT NULL,
  `reserva_id` VARCHAR(30),
  `bot_id`     VARCHAR(30) NOT NULL DEFAULT 'default',
  UNIQUE KEY `uniq_slot` (`fecha`, `hora`, `bot_id`),
  INDEX `idx_fecha_slot` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pagos_pendientes` (
  `reserva_id` VARCHAR(30) NOT NULL PRIMARY KEY,
  `phone`      VARCHAR(25) NOT NULL,
  `expira_en`  TIMESTAMP   NOT NULL,
  INDEX `idx_expira` (`expira_en`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bots` (
  `id`                 VARCHAR(30)  NOT NULL PRIMARY KEY,
  `nombre`             VARCHAR(100) NOT NULL,
  `tipo`               ENUM('grass','comercio','restaurant') NOT NULL DEFAULT 'grass',
  `phone_number_id`    VARCHAR(60),
  `admin_phone`        VARCHAR(25),
  `config`             JSON,
  `plan`               ENUM('demo','mensual','anual','lifetime') NOT NULL DEFAULT 'demo',
  `plan_inicio`        DATE,
  `plan_expira`        DATE,
  `activo`             TINYINT(1) NOT NULL DEFAULT 1,
  `waba_token`         VARCHAR(500) NULL,
  `tipo_conexion`      ENUM('gestionado','propio') NOT NULL DEFAULT 'gestionado',
  `estado_conexion`    ENUM('pendiente','activo','error') NOT NULL DEFAULT 'pendiente',
  `webhook_configurado` TINYINT(1) NOT NULL DEFAULT 0,
  `numero_display`     VARCHAR(30) NULL,
  `nombre_verificado`  VARCHAR(100) NULL,
  `creado_en`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `actualizado`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tipo`   (`tipo`),
  INDEX `idx_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── ROLES EMPRESARIALES (v3.0) ────────────────────────────────

CREATE TABLE IF NOT EXISTS `usuarios` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `persona_id`    INT NULL,
  `usuario`       VARCHAR(80)  NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `rol`           ENUM('root','administrador','administrador_bot','cliente','admin','operador','consulta')
                  NOT NULL DEFAULT 'cliente',
  `activo`        TINYINT(1) NOT NULL DEFAULT 1,
  `ultimo_login`  TIMESTAMP NULL,
  `creado_en`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `actualizado`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_usuario` (`usuario`),
  UNIQUE KEY `uniq_usuario_persona` (`persona_id`),
  CONSTRAINT `fk_usuarios_persona`
    FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `usuario_bots` (
  `usuario_id`     INT NOT NULL,
  `bot_id`         VARCHAR(30) NOT NULL,
  `puede_editar`   TINYINT(1) NOT NULL DEFAULT 1,
  `puede_ver_stats` TINYINT(1) NOT NULL DEFAULT 0,
  `creado_en`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`usuario_id`, `bot_id`),
  CONSTRAINT `fk_usuario_bots_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_usuario_bots_bot`
    FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── ALTERACIONES SEGURAS (si ya existen tablas antiguas) ─────
-- Estas instrucciones usan IF para no fallar si ya existen

-- Ampliar ENUM de usuarios.rol (si la tabla ya existía con roles viejos)
ALTER TABLE `usuarios`
  MODIFY COLUMN `rol`
    ENUM('root','administrador','administrador_bot','cliente','admin','operador','consulta')
    NOT NULL DEFAULT 'cliente';

-- Agregar campos a usuario_bots si la tabla ya existía sin ellos
ALTER TABLE `usuario_bots`
  ADD COLUMN IF NOT EXISTS `puede_editar`    TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `puede_ver_stats` TINYINT(1) NOT NULL DEFAULT 0;

-- Agregar columnas a bots si venías de la versión anterior
ALTER TABLE `bots`
  ADD COLUMN IF NOT EXISTS `waba_token`          VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS `tipo_conexion`        ENUM('gestionado','propio') NOT NULL DEFAULT 'gestionado',
  ADD COLUMN IF NOT EXISTS `estado_conexion`      ENUM('pendiente','activo','error') NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS `webhook_configurado`  TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `numero_display`       VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS `nombre_verificado`    VARCHAR(100) NULL;

-- Agregar bot_id a conversaciones/reservas/slots si faltan
ALTER TABLE `conversaciones`
  ADD COLUMN IF NOT EXISTS `bot_id` VARCHAR(30) NOT NULL DEFAULT 'default';

ALTER TABLE `reservas`
  ADD COLUMN IF NOT EXISTS `bot_id` VARCHAR(30) NOT NULL DEFAULT 'default';

ALTER TABLE `slots_ocupados`
  ADD COLUMN IF NOT EXISTS `bot_id` VARCHAR(30) NOT NULL DEFAULT 'default';

-- Migrar roles legacy → nuevos (solo afecta usuarios existentes)
UPDATE `usuarios` SET `rol` = 'root'               WHERE `rol` = 'admin';
UPDATE `usuarios` SET `rol` = 'administrador_bot'  WHERE `rol` = 'operador';
UPDATE `usuarios` SET `rol` = 'cliente'            WHERE `rol` = 'consulta';

-- ── FIN ──────────────────────────────────────────────────────
SELECT 'Migración completada exitosamente' AS resultado;
