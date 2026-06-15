-- Migración 005: Sistema de roles empresarial
-- Nuevos roles: root, administrador, administrador_bot, cliente
-- Se mantiene compatibilidad hacia atrás (admin → root)

-- Actualizar tabla usuarios con nuevos roles
ALTER TABLE `usuarios`
  MODIFY COLUMN `rol`
    ENUM('root','administrador','administrador_bot','cliente','admin','operador','consulta')
    NOT NULL DEFAULT 'cliente';

-- Tabla de asignación de bots a clientes (ya existe como usuario_bots, pero añadimos permisos de edición)
ALTER TABLE `usuario_bots`
  ADD COLUMN IF NOT EXISTS `puede_editar` TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS `puede_ver_stats` TINYINT(1) NOT NULL DEFAULT 0;

-- Vista para clientes: solo sus bots activos
CREATE OR REPLACE VIEW `v_cliente_bots` AS
  SELECT
    b.id, b.nombre, b.tipo, b.plan, b.activo,
    b.estado_conexion, b.numero_display, b.nombre_verificado,
    b.config, b.creado_en,
    ub.usuario_id, ub.puede_editar, ub.puede_ver_stats
  FROM bots b
  INNER JOIN usuario_bots ub ON ub.bot_id = b.id;

-- Migrar roles existentes al nuevo esquema
UPDATE `usuarios` SET `rol` = 'root'           WHERE `rol` = 'admin';
UPDATE `usuarios` SET `rol` = 'administrador_bot' WHERE `rol` = 'operador';
UPDATE `usuarios` SET `rol` = 'cliente'        WHERE `rol` = 'consulta';

-- Limpiar roles legacy de la definición (opcional, después de validar migración)
-- ALTER TABLE `usuarios` MODIFY COLUMN `rol`
--   ENUM('root','administrador','administrador_bot','cliente') NOT NULL DEFAULT 'cliente';
