// ============================================================
// migrate.js — Crea / actualiza todas las tablas en MySQL
// Uso: node migrate.js
// ============================================================
import 'dotenv/config';
import mysql from 'mysql2/promise';

const cfg = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: (process.env.DB_PASSWORD || '').trim().replace(/^['"]|['"]$/g, ''),
  database: process.env.DB_NAME     || 'gespro_asist',
  multipleStatements: true,
};

const SQL = `
-- personas
CREATE TABLE IF NOT EXISTS \`personas\` (
  \`id\`        INT AUTO_INCREMENT PRIMARY KEY,
  \`dni\`       VARCHAR(8)   NOT NULL,
  \`nombres\`   VARCHAR(100) NOT NULL,
  \`apellidos\` VARCHAR(100) NOT NULL,
  \`fuente\`    ENUM('api','manual') NOT NULL DEFAULT 'api',
  \`creado_en\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY \`uniq_dni\` (\`dni\`),
  INDEX \`idx_dni\` (\`dni\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- conversaciones
CREATE TABLE IF NOT EXISTS \`conversaciones\` (
  \`phone\`       VARCHAR(25) NOT NULL PRIMARY KEY,
  \`estado\`      VARCHAR(50) NOT NULL DEFAULT 'INICIO',
  \`datos\`       JSON,
  \`historial\`   JSON,
  \`actualizado\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- reservas
CREATE TABLE IF NOT EXISTS \`reservas\` (
  \`id\`              VARCHAR(30)  NOT NULL PRIMARY KEY,
  \`phone\`           VARCHAR(25)  NOT NULL,
  \`dni\`             VARCHAR(8),
  \`nombres\`         VARCHAR(100),
  \`apellidos\`       VARCHAR(100),
  \`tipo_cancha\`     VARCHAR(60),
  \`fecha\`           DATE         NOT NULL,
  \`fecha_display\`   VARCHAR(20),
  \`fecha_nombre\`    VARCHAR(80),
  \`horas\`           JSON,
  \`costo_total\`     DECIMAL(8,2) DEFAULT 0,
  \`monto_reserva\`   DECIMAL(8,2) DEFAULT 0,
  \`estado\`          ENUM(
    'PENDIENTE_PAGO','COMPROBANTE_ENVIADO','EN_REVISION',
    'CONFIRMADA','RECHAZADA','CANCELADA_TIMEOUT','CANCELADA_SLOTS_OCUPADOS'
  ) NOT NULL DEFAULT 'PENDIENTE_PAGO',
  \`numero_op\`       VARCHAR(60),
  \`comprobante_id\`  VARCHAR(120),
  \`creado_en\`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_phone\`  (\`phone\`),
  INDEX \`idx_fecha\`  (\`fecha\`),
  INDEX \`idx_estado\` (\`estado\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- slots_ocupados
CREATE TABLE IF NOT EXISTS \`slots_ocupados\` (
  \`id\`         INT AUTO_INCREMENT PRIMARY KEY,
  \`fecha\`      DATE       NOT NULL,
  \`hora\`       VARCHAR(5) NOT NULL,
  \`reserva_id\` VARCHAR(30),
  UNIQUE KEY \`uniq_slot\`     (\`fecha\`, \`hora\`),
  INDEX \`idx_fecha_slot\`    (\`fecha\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- pagos_pendientes
CREATE TABLE IF NOT EXISTS \`pagos_pendientes\` (
  \`reserva_id\` VARCHAR(30) NOT NULL PRIMARY KEY,
  \`phone\`      VARCHAR(25) NOT NULL,
  \`expira_en\`  TIMESTAMP   NOT NULL,
  INDEX \`idx_expira\` (\`expira_en\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- bots (multi-bot)
CREATE TABLE IF NOT EXISTS \`bots\` (
  \`id\`              VARCHAR(30)  NOT NULL PRIMARY KEY,
  \`nombre\`          VARCHAR(100) NOT NULL,
  \`tipo\`            ENUM('grass','comercio','restaurant') NOT NULL DEFAULT 'grass',
  \`phone_number_id\` VARCHAR(60),
  \`admin_phone\`     VARCHAR(25),
  \`config\`          JSON,
  \`plan\`            ENUM('demo','mensual','anual','lifetime') NOT NULL DEFAULT 'demo',
  \`plan_inicio\`     DATE,
  \`plan_expira\`     DATE,
  \`activo\`          TINYINT(1) NOT NULL DEFAULT 1,
  \`creado_en\`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`actualizado\`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`idx_tipo\`   (\`tipo\`),
  INDEX \`idx_activo\` (\`activo\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- usuarios del dashboard vinculados con personas RENIEC
CREATE TABLE IF NOT EXISTS \`usuarios\` (
  \`id\`            INT AUTO_INCREMENT PRIMARY KEY,
  \`persona_id\`    INT NULL,
  \`usuario\`       VARCHAR(80)  NOT NULL,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`rol\`           ENUM('admin','operador','consulta') NOT NULL DEFAULT 'operador',
  \`activo\`        TINYINT(1) NOT NULL DEFAULT 1,
  \`ultimo_login\`  TIMESTAMP NULL,
  \`creado_en\`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  \`actualizado\`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY \`uniq_usuario\` (\`usuario\`),
  UNIQUE KEY \`uniq_usuario_persona\` (\`persona_id\`),
  CONSTRAINT \`fk_usuarios_persona\` FOREIGN KEY (\`persona_id\`) REFERENCES \`personas\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- bots visibles para cada usuario
CREATE TABLE IF NOT EXISTS \`usuario_bots\` (
  \`usuario_id\` INT NOT NULL,
  \`bot_id\`     VARCHAR(30) NOT NULL,
  \`creado_en\`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`usuario_id\`, \`bot_id\`),
  CONSTRAINT \`fk_usuario_bots_usuario\` FOREIGN KEY (\`usuario_id\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_usuario_bots_bot\` FOREIGN KEY (\`bot_id\`) REFERENCES \`bots\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

async function run() {
  let conn;
  console.log('\nGespro Asist - Script de Migración MySQL\n');
  console.log(`📡 Conectando a ${cfg.host}:${cfg.port} → base "${cfg.database}"...`);

  try {
    conn = await mysql.createConnection(cfg);
    console.log('✅ Conexión exitosa\n');

    const statements = SQL.replace(/^\s*--.*$/gm, '').split(';')
      .map(s => s.trim())
      .filter(s => s.length > 5);

    for (const stmt of statements) {
      const tableName = stmt.match(/TABLE.*?`(\w+)`/i)?.[1] || '?';
      try {
        await conn.execute(stmt);
        console.log(`  ✅ Tabla "${tableName}" OK`);
      } catch (err) {
        if (err.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`  ⏭️  Tabla "${tableName}" ya existe`);
        } else {
          console.warn(`  ⚠️  "${tableName}": ${err.message}`);
        }
      }
    }

    // Fix: ALTER para agregar CANCELADA_SLOTS_OCUPADOS si falta
    try {
      await conn.execute(`
        ALTER TABLE \`reservas\`
        MODIFY COLUMN \`estado\` ENUM(
          'PENDIENTE_PAGO','COMPROBANTE_ENVIADO','EN_REVISION',
          'CONFIRMADA','RECHAZADA','CANCELADA_TIMEOUT','CANCELADA_SLOTS_OCUPADOS'
        ) NOT NULL DEFAULT 'PENDIENTE_PAGO'
      `);
      console.log('  ✅ ENUM reservas.estado actualizado');
    } catch {
      console.log('  ⏭️  ENUM reservas.estado ya actualizado');
    }

    // ── 004: multitenancy ──────────────────────────────────────────
    console.log('\n--- Multitenancy ---');
    const alters = [
      [`ALTER TABLE \`bots\` ADD COLUMN \`waba_token\` VARCHAR(500) NULL`,             'bots.waba_token'],
      [`ALTER TABLE \`bots\` ADD COLUMN \`tipo_conexion\` ENUM('gestionado','propio') NOT NULL DEFAULT 'gestionado'`, 'bots.tipo_conexion'],
      [`ALTER TABLE \`bots\` ADD COLUMN \`estado_conexion\` ENUM('pendiente','activo','error') NOT NULL DEFAULT 'pendiente'`, 'bots.estado_conexion'],
      [`ALTER TABLE \`bots\` ADD COLUMN \`webhook_configurado\` TINYINT(1) NOT NULL DEFAULT 0`, 'bots.webhook_configurado'],
      [`ALTER TABLE \`bots\` ADD COLUMN \`numero_display\` VARCHAR(30) NULL`,           'bots.numero_display'],
      [`ALTER TABLE \`bots\` ADD COLUMN \`nombre_verificado\` VARCHAR(100) NULL`,       'bots.nombre_verificado'],
      [`ALTER TABLE \`bots\` ADD UNIQUE KEY \`uniq_phone_number_id\` (\`phone_number_id\`)`, 'bots UNIQUE phone_number_id'],
      [`ALTER TABLE \`conversaciones\` ADD COLUMN \`bot_id\` VARCHAR(30) NOT NULL DEFAULT 'default'`, 'conversaciones.bot_id'],
    ];
    for (const [sql, label] of alters) {
      try {
        await conn.execute(sql);
        console.log(`  ✅ ${label}`);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_KEYNAME' || e.message.includes('Duplicate')) {
          console.log(`  ⏭️  ${label} ya existe`);
        } else {
          console.warn(`  ⚠️  ${label}: ${e.message}`);
        }
      }
    }
    // Rehacer PK de conversaciones (phone → bot_id + phone)
    try {
      await conn.execute(`ALTER TABLE \`conversaciones\` DROP PRIMARY KEY`);
      await conn.execute(`ALTER TABLE \`conversaciones\` ADD PRIMARY KEY (\`bot_id\`, \`phone\`)`);
      console.log('  ✅ conversaciones PK → (bot_id, phone)');
    } catch (e) {
      console.log('  ⏭️  conversaciones PK ya actualizada');
    }

    console.log('\n🎉 Migración completada exitosamente\n');

  } catch (err) {
    console.error('\n❌ ERROR de conexión:', err.message);
    console.error('\n🔧 Verifica tu .env:');
    console.error(`   DB_HOST     = ${cfg.host}`);
    console.error(`   DB_PORT     = ${cfg.port}`);
    console.error(`   DB_USER     = ${cfg.user}`);
    console.error(`   DB_PASSWORD = ${cfg.password ? '(set)' : '(vacío)'}`);
    console.error(`   DB_NAME     = ${cfg.database}`);
    console.error('\n💡 Asegúrate de que MySQL está corriendo y la DB existe.');
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();
