import 'dotenv/config';
import mysql from 'mysql2/promise';
import { hashPassword } from './auth.js';

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: (process.env.DB_PASSWORD || '').trim().replace(/^['"]|['"]$/g, ''),
  database: process.env.DB_NAME || 'gespro_asist',
};

const seedUser = process.env.SEED_USER || 'test_admin';
const seedPassword = process.env.SEED_PASSWORD || 'Test1234!';
const seedDni = process.env.SEED_DNI || '00000001';

async function run() {
  let conn;
  try {
    conn = await mysql.createConnection(cfg);
    await conn.beginTransaction();

    await conn.execute(
      `INSERT INTO personas (dni, nombres, apellidos, fuente)
       VALUES (?, 'Usuario', 'De Prueba', 'manual')
       ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), apellidos = VALUES(apellidos)`,
      [seedDni]
    );
    const [[persona]] = await conn.execute('SELECT id FROM personas WHERE dni = ?', [seedDni]);

    await conn.execute(
      `INSERT INTO bots (id, nombre, tipo, config, plan, activo)
       VALUES ('BOT-TEST', 'Bot de prueba Gespro Asist', 'grass', ?, 'demo', 1)
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), activo = 1`,
      [JSON.stringify({ entorno: 'test', precio_hora: 50 })]
    );

    await conn.execute(
      `INSERT INTO usuarios (persona_id, usuario, password_hash, rol, activo)
       VALUES (?, ?, ?, 'admin', 1)
       ON DUPLICATE KEY UPDATE
         persona_id = VALUES(persona_id),
         password_hash = VALUES(password_hash),
         rol = 'admin',
         activo = 1`,
      [persona.id, seedUser, hashPassword(seedPassword)]
    );
    const [[usuario]] = await conn.execute('SELECT id FROM usuarios WHERE usuario = ?', [seedUser]);

    await conn.execute(
      'INSERT IGNORE INTO usuario_bots (usuario_id, bot_id) VALUES (?, ?)',
      [usuario.id, 'BOT-TEST']
    );

    await conn.execute(
      `INSERT INTO reservas (
         id, phone, dni, nombres, apellidos, tipo_cancha, fecha,
         fecha_display, fecha_nombre, horas, costo_total, monto_reserva, estado
       ) VALUES (
         'RES-TEST-001', '51999999999', ?, 'Usuario', 'De Prueba', 'Fútbol',
         DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'Mañana', 'Fecha de prueba',
         ?, 100, 50, 'EN_REVISION'
       )
       ON DUPLICATE KEY UPDATE estado = VALUES(estado), fecha = VALUES(fecha)`,
      [seedDni, JSON.stringify(['18:00', '19:00'])]
    );

    await conn.commit();
    console.log('Seed completado.');
    console.log(`Usuario de prueba: ${seedUser}`);
    console.log(`Password de prueba: ${seedPassword}`);
    console.log(`DNI vinculado: ${seedDni}`);
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Error ejecutando seed:', err.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

run();
