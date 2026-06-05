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
