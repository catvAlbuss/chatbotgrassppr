// ============================================================
// db.js - Pool de conexiones MySQL con mysql2/promise
// Compatible con Hostinger y ESM (type: "module")
// ============================================================
import mysql from 'mysql2/promise';

let pool = null;

function getPool() {
    if (pool) return pool;

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
        keepAliveInitialDelay: 0,
        // Reconexión automática
        connectTimeout: 10000,
    });

    // Verificar conexión al iniciar
    pool.getConnection()
        .then(conn => {
            console.log('✅ MySQL conectado:', process.env.DB_HOST, '/', process.env.DB_NAME);
            conn.release();
        })
        .catch(err => {
            console.error('❌ Error conectando a MySQL:', err.message);
            console.error('   Verifica DB_HOST, DB_USER, DB_PASSWORD, DB_NAME en .env');
        });

    return pool;
}

/**
 * Ejecuta una query con parámetros y retorna [rows, fields]
 */
export async function query(sql, params = []) {
    try {
        const [rows, fields] = await getPool().execute(sql, params);
        return rows;
    } catch (err) {
        console.error('❌ DB Error en query:', err.message);
        console.error('   SQL:', sql);
        throw err;
    }
}

/**
 * Retorna una sola fila o null
 */
export async function queryOne(sql, params = []) {
    const rows = await query(sql, params);
    return rows[0] || null;
}

export default getPool;
