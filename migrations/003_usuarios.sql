-- Usuarios de dashboard vinculados con personas consultadas en RENIEC.
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `persona_id`    INT NULL,
  `usuario`       VARCHAR(80)  NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `rol`           ENUM('admin','operador','consulta') NOT NULL DEFAULT 'operador',
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
  `usuario_id` INT NOT NULL,
  `bot_id`     VARCHAR(30) NOT NULL,
  `creado_en`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`usuario_id`, `bot_id`),
  CONSTRAINT `fk_usuario_bots_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_usuario_bots_bot`
    FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
