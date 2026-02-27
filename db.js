// ============================================================
// db.js - Pool de conexiones MySQL con mysql2/promise
// Si la BD no está configurada → funciona en modo memoria (sin crashes)
// ============================================================
import mysql from 'mysql2/promise';

let pool = null;
let dbActiva = false;

// Detectar si las credenciales son placeholders o están vacías
function credencialesConfiguradas() {
    const host = process.env.DB_HOST || '';
    return host && host !== 'srv1234.hstgr.io' && host !== 'localhost_placeholder';
}

export function getPool() {
    if (pool) return pool;
    if (!credencialesConfiguradas()) {
        console.warn('⚠️  [DB] DB_HOST no configurado o es placeholder. Modo memoria activado.');
        return null;
    }

    pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        connectTimeout: 10000,
    });

    // Verificar conexión sin bloquear el arranque
    pool.getConnection()
        .then(conn => {
            dbActiva = true;
            console.log('✅ [DB] MySQL conectado:', process.env.DB_HOST, '/', process.env.DB_NAME);
            conn.release();
        })
        .catch(err => {
            dbActiva = false;
            console.error('❌ [DB] No se pudo conectar a MySQL:', err.message);
            console.error('   ↳ Verifica DB_HOST, DB_USER, DB_PASSWORD, DB_NAME en .env');
            console.error('   ↳ El bot seguirá funcionando EN MEMORIA (los datos no persisten al reiniciar)');
        });

    return pool;
}

/**
 * Ejecuta una query. Retorna las filas o null si falla/no hay BD.
 * NUNCA relanza el error — el bot nunca debe crashear por la BD.
 */
export async function query(sql, params = []) {
    const p = getPool();
    if (!p) return null; // Sin BD → modo memoria

    try {
        const [rows] = await p.execute(sql, params);
        return rows;
    } catch (err) {
        console.error('❌ [DB] Error en query:', err.message);
        console.error('   SQL:', sql.slice(0, 80));
        return null; // Retorna null en vez de crashear
    }
}

/**
 * Retorna una sola fila o null.
 */
export async function queryOne(sql, params = []) {
    const rows = await query(sql, params);
    return (rows && rows.length > 0) ? rows[0] : null;
}

export function isDbActiva() { return dbActiva; }

export default getPool;
