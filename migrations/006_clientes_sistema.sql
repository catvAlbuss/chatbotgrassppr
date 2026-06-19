-- 006: clientes que contratan la plataforma.
-- No confundir con `personas`, que contiene contactos captados por los bots.

CREATE TABLE IF NOT EXISTS `clientes_sistema` (
  `id`                INT AUTO_INCREMENT PRIMARY KEY,
  `razon_social`      VARCHAR(160) NOT NULL,
  `nombre_comercial`  VARCHAR(120),
  `tipo_documento`    ENUM('RUC','DNI','CE','OTRO') NOT NULL DEFAULT 'RUC',
  `numero_documento`  VARCHAR(20) NOT NULL,
  `contacto_nombre`   VARCHAR(120),
  `contacto_email`    VARCHAR(160),
  `contacto_telefono` VARCHAR(25),
  `estado`            ENUM('activo','suspendido') NOT NULL DEFAULT 'activo',
  `notas`             TEXT,
  `creado_en`         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `actualizado`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_cliente_sistema_documento` (`tipo_documento`, `numero_documento`),
  INDEX `idx_cliente_sistema_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `usuarios`
  ADD COLUMN IF NOT EXISTS `cliente_sistema_id` INT NULL AFTER `persona_id`;

ALTER TABLE `bots`
  ADD COLUMN IF NOT EXISTS `cliente_sistema_id` INT NULL AFTER `id`;

ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_usuarios_cliente_sistema`
  FOREIGN KEY (`cliente_sistema_id`) REFERENCES `clientes_sistema`(`id`) ON DELETE SET NULL;

ALTER TABLE `bots`
  ADD CONSTRAINT `fk_bots_cliente_sistema`
  FOREIGN KEY (`cliente_sistema_id`) REFERENCES `clientes_sistema`(`id`) ON DELETE SET NULL;
