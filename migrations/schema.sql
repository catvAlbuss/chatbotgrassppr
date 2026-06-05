-- ============================================================
-- schema.sql - Script para crear las tablas en phpMyAdmin
-- Importa este archivo desde phpMyAdmin → Importar
-- ============================================================

-- Usar la base de datos configurada
-- (phpMyAdmin ya la tiene seleccionada, no es necesario)

-- ─── TABLA: personas ─────────────────────────────────────
-- Caché de DNIs consultados (RENIEC vía APISPerú)
CREATE TABLE IF NOT EXISTS `personas` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `dni`        VARCHAR(8)   NOT NULL,
  `nombres`    VARCHAR(100) NOT NULL,
  `apellidos`  VARCHAR(100) NOT NULL,
  `fuente`     ENUM('api','manual') NOT NULL DEFAULT 'api',
  `creado_en`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_dni` (`dni`),
  INDEX `idx_dni` (`dni`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ejecutar también 002_bots.sql y 003_usuarios.sql para completar el esquema.

-- ─── TABLA: conversaciones ────────────────────────────────
-- Estado actual de cada conversación por número de teléfono
CREATE TABLE IF NOT EXISTS `conversaciones` (
  `phone`       VARCHAR(25)  NOT NULL PRIMARY KEY,
  `estado`      VARCHAR(50)  NOT NULL DEFAULT 'INICIO',
  `datos`       JSON,
  `historial`   JSON,
  `actualizado` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── TABLA: reservas ─────────────────────────────────────
-- Reservas completas con todos los datos
CREATE TABLE IF NOT EXISTS `reservas` (
  `id`              VARCHAR(30)   NOT NULL PRIMARY KEY,
  `phone`           VARCHAR(25)   NOT NULL,
  `dni`             VARCHAR(8),
  `nombres`         VARCHAR(100),
  `apellidos`       VARCHAR(100),
  `tipo_cancha`     VARCHAR(60),
  `fecha`           DATE          NOT NULL,
  `fecha_display`   VARCHAR(20),
  `fecha_nombre`    VARCHAR(80),
  `horas`           JSON,
  `costo_total`     DECIMAL(8,2)  DEFAULT 0,
  `monto_reserva`   DECIMAL(8,2)  DEFAULT 0,
  `estado`          ENUM(
                      'PENDIENTE_PAGO',
                      'COMPROBANTE_ENVIADO',
                      'EN_REVISION',
                      'CONFIRMADA',
                      'RECHAZADA',
                      'CANCELADA_TIMEOUT'
                    ) NOT NULL DEFAULT 'PENDIENTE_PAGO',
  `numero_op`       VARCHAR(60),
  `comprobante_id`  VARCHAR(120),
  `creado_en`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_phone` (`phone`),
  INDEX `idx_fecha` (`fecha`),
  INDEX `idx_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── TABLA: slots_ocupados ────────────────────────────────
-- Horas bloqueadas por reservas confirmadas
CREATE TABLE IF NOT EXISTS `slots_ocupados` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `fecha`       DATE       NOT NULL,
  `hora`        VARCHAR(5) NOT NULL,
  `reserva_id`  VARCHAR(30),
  UNIQUE KEY `uniq_slot` (`fecha`, `hora`),
  INDEX `idx_fecha_slot` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── TABLA: pagos_pendientes ─────────────────────────────
-- Registro de pagos esperando comprobante (con tiempo de expiración)
CREATE TABLE IF NOT EXISTS `pagos_pendientes` (
  `reserva_id` VARCHAR(30) NOT NULL PRIMARY KEY,
  `phone`      VARCHAR(25) NOT NULL,
  `expira_en`  TIMESTAMP   NOT NULL,
  INDEX `idx_expira` (`expira_en`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
