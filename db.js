// ============================================================
// db.js - Pool de conexiones MySQL con mysql2/promise
// Compatible con Hostinger (127.0.0.1) y ESM (type: "module")
// ============================================================
import mysql from 'mysql2/promise';

let pool = null;

function getPool() {
    if (pool) return pool;

    pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 30000,
        connectTimeout: 15000,
        // Importante en Hostinger: MySQL local no necesita SSL
        ssl: false,
        // Reconexión automática ante pérdida de conexión
        namedPlaceholders: false,
    });

    return pool;
}

/**
 * Verifica la conexión y la retorna — llamar durante el inicio del servidor
 */
export async function verificarConexionDB() {
    try {
        const conn = await getPool().getConnection();
        conn.release();
        console.log('✅ MySQL conectado correctamente → DB:', process.env.DB_NAME);
        return true;
    } catch (err) {
        console.error('❌ MySQL ERROR:', err.message);
        console.error('   Host:', process.env.DB_HOST, '| DB:', process.env.DB_NAME);
        return false; // No crashear — el bot puede funcionar sin BD (con degradación)
    }
}

/**
 * Ejecuta una query con parámetros preparados.
 * Retorna array de filas o lanza error.
 */
export async function query(sql, params = []) {
    try {
        const [rows] = await getPool().execute(sql, params);
        return rows;
    } catch (err) {
        console.error('❌ DB query error:', err.message);
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
