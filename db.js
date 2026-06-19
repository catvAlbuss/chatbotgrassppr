// ============================================================
// db.js - Pool de conexiones MySQL con mysql2/promise
// Compatible con Hostinger (localhost) y ESM (type: "module")
// ============================================================
import mysql from 'mysql2/promise';

let pool = null;

function env(name, fallback = undefined) {
    const raw = process.env[name];
    if (raw == null) return fallback;

    // Limpia espacios y comillas accidentales de paneles de hosting
    const trimmed = String(raw).trim();
    return trimmed.replace(/^['\"]|['\"]$/g, '');
}

function buildDbConfig() {
    const host = env('DB_HOST', 'localhost');
    const port = Number.parseInt(env('DB_PORT', '3306'), 10);

    return {
        host,
        port: Number.isNaN(port) ? 3306 : port,
        user: env('DB_USER'),
        password: env('DB_PASSWORD'),
        database: env('DB_NAME'),
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 30000,
        connectTimeout: 15000,
        // MySQL local en Hostinger no necesita SSL
        ssl: false,
        namedPlaceholders: false,
        // Evita convertir columnas DATE a ISO UTC al enviarlas al dashboard.
        dateStrings: true,
    };
}

function getPool() {
    if (pool) return pool;
    pool = mysql.createPool(buildDbConfig());
    return pool;
}

/**
 * Verifica la conexion y la retorna - llamar durante el inicio del servidor
 */
export async function verificarConexionDB() {
    const cfg = buildDbConfig();

    try {
        const conn = await getPool().getConnection();
        conn.release();
        console.log('[OK] MySQL conectado correctamente -> DB:', cfg.database, '| Host:', cfg.host, '| User:', cfg.user);
        return true;
    } catch (err) {
        console.error('[ERR] MySQL ERROR:', err.message);
        console.error('   Host:', cfg.host, '| DB:', cfg.database, '| User:', cfg.user);
        console.error('   DB_PASSWORD length:', cfg.password ? String(cfg.password).length : 0);
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('   ⚠️  Verifica DB_USER y DB_PASSWORD en tu .env');
        } else if (err.code === 'ER_BAD_DB_ERROR') {
            console.error('   ⚠️  La base de datos no existe. Créala en phpMyAdmin y ejecuta: npm run migrate');
        } else if (err.code === 'ECONNREFUSED') {
            console.error('   ⚠️  MySQL no está corriendo o el HOST/PORT es incorrecto');
        }
        return false; // No crashear - el bot puede funcionar sin BD (con degradacion)
    }
}

/**
 * Garantiza el esquema requerido por clientes del sistema antes de servir tráfico.
 * Es idempotente y cubre despliegues donde se actualizó el código sin ejecutar 006.
 */
export async function asegurarEsquemaClientesSistema() {
    const conn = await getPool().getConnection();
    try {
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS \`clientes_sistema\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`razon_social\` VARCHAR(160) NOT NULL,
                \`nombre_comercial\` VARCHAR(120),
                \`tipo_documento\` ENUM('RUC','DNI','CE','OTRO') NOT NULL DEFAULT 'RUC',
                \`numero_documento\` VARCHAR(20) NOT NULL,
                \`contacto_nombre\` VARCHAR(120),
                \`contacto_email\` VARCHAR(160),
                \`contacto_telefono\` VARCHAR(25),
                \`estado\` ENUM('activo','suspendido') NOT NULL DEFAULT 'activo',
                \`notas\` TEXT,
                \`creado_en\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`actualizado\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY \`uniq_cliente_sistema_documento\` (\`tipo_documento\`, \`numero_documento\`),
                INDEX \`idx_cliente_sistema_estado\` (\`estado\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        for (const [tabla, posicion] of [['usuarios', 'AFTER `persona_id`'], ['bots', 'AFTER `id`']]) {
            const [columns] = await conn.execute(
                `SELECT 1 FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
                   AND COLUMN_NAME = 'cliente_sistema_id' LIMIT 1`,
                [tabla]
            );
            if (!columns.length) {
                await conn.execute(
                    `ALTER TABLE \`${tabla}\` ADD COLUMN \`cliente_sistema_id\` INT NULL ${posicion}`
                );
            }
        }

        const relaciones = [
            ['usuarios', 'fk_usuarios_cliente_sistema'],
            ['bots', 'fk_bots_cliente_sistema'],
        ];
        for (const [tabla, nombre] of relaciones) {
            const [constraints] = await conn.execute(
                `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
                 WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ?
                   AND CONSTRAINT_NAME = ? LIMIT 1`,
                [tabla, nombre]
            );
            if (!constraints.length) {
                await conn.execute(
                    `ALTER TABLE \`${tabla}\` ADD CONSTRAINT \`${nombre}\`
                     FOREIGN KEY (\`cliente_sistema_id\`) REFERENCES \`clientes_sistema\`(\`id\`)
                     ON DELETE SET NULL`
                );
            }
        }

        console.log('[OK] Esquema clientes_sistema verificado');
        return true;
    } catch (err) {
        console.error('[ERR] No se pudo preparar el esquema clientes_sistema:', err.message);
        console.error('      Ejecuta `npm run migrate` con un usuario que tenga permisos CREATE/ALTER.');
        return false;
    } finally {
        conn.release();
    }
}

/**
 * Ejecuta una query con parametros preparados.
 * Retorna array de filas o lanza error.
 */
export async function query(sql, params = []) {
    try {
        const [rows] = await getPool().execute(sql, params);
        return rows;
    } catch (err) {
        console.error('[ERR] DB query error:', err.message);
        console.error('   SQL:', sql.substring(0, 120));
        throw err;
    }
}

/**
 * Retorna la primera fila o null.
 */
export async function queryOne(sql, params = []) {
    const rows = await query(sql, params);
    return rows[0] ?? null;
}

export default getPool;
