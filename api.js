// ============================================================
// api.js - Rutas REST para el dashboard de administración
// ============================================================
import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { query, queryOne } from './db.js';
import {
  getReserva, actualizarReserva,
  intentarReservarSlot, eliminarPagoPendiente,
  pagosPendientes
} from './storage.js';
import { enviarTexto } from './whatsapp.js';
import { buscarDNI } from './reniec.js';
import { hashPassword, verifyPassword } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
const CONFIG_PATH = path.join(__dirname, 'botconfig.json');

const JWT_SECRET = () => process.env.DASHBOARD_SECRET || 'gespro_asist_secret_2026';

// ─── AUTH MIDDLEWARE ─────────────────────────────────────────
// Jerarquía: root > administrador > administrador_bot > cliente
const ROL_NIVEL = {
  root: 4, administrador: 3, administrador_bot: 2, cliente: 1,
  admin: 4, operador: 2, consulta: 1  // legacy
};

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET());
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Requiere nivel mínimo de rol
function requireNivel(minNivel) {
  return (req, res, next) => {
    const nivel = ROL_NIVEL[req.user?.rol] || 0;
    if (nivel < minNivel) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }
    next();
  };
}

// Shortcuts de nivel
const adminBotOnly    = requireNivel(2);  // administrador_bot+
const adminOnly       = requireNivel(3);  // administrador+
const rootOnly        = requireNivel(4);  // root solamente

// Helpers
function esAdmin(rol)      { return (ROL_NIVEL[rol] || 0) >= 3; }
function esAdminBot(rol)   { return (ROL_NIVEL[rol] || 0) >= 2; }
function esCliente(rol)    { return rol === 'cliente' || rol === 'consulta'; }

// ─── AUTENTICACIÓN ───────────────────────────────────────────
router.post('/auth/login', async (req, res) => {
  const { usuario, password } = req.body || {};
  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  try {
    const user = await queryOne(
      `SELECT u.id, u.usuario, u.password_hash, u.rol, p.dni, p.nombres, p.apellidos
       FROM usuarios u
       LEFT JOIN personas p ON p.id = u.persona_id
       WHERE u.usuario = ? AND u.activo = 1`,
      [usuario]
    );

    if (user && verifyPassword(password, user.password_hash)) {
      await query('UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
      const claims = { id: user.id, usuario: user.usuario, rol: user.rol };
      const token = jwt.sign(claims, JWT_SECRET(), { expiresIn: '24h' });
      return res.json({
        token,
        usuario: user.usuario,
        rol: user.rol,
        persona: user.dni ? {
          dni: user.dni,
          nombres: user.nombres,
          apellidos: user.apellidos
        } : null
      });
    }
  } catch (err) {
    console.warn('[AUTH] Login DB no disponible, usando compatibilidad .env:', err.message);
  }

  const legacyUserOk = usuario === (process.env.DASHBOARD_USER || 'admin');
  const legacyPassOk = password === (process.env.DASHBOARD_PASSWORD || 'admin123');
  if (legacyUserOk && legacyPassOk) {
    const token = jwt.sign({ usuario, rol: 'admin', legacy: true }, JWT_SECRET(), { expiresIn: '24h' });
    return res.json({ token, usuario, rol: 'admin' });
  }
  res.status(401).json({ error: 'Credenciales incorrectas' });
});

router.post('/auth/refresh', auth, (req, res) => {
  const token = jwt.sign(
    { id: req.user.id, usuario: req.user.usuario, rol: req.user.rol, legacy: req.user.legacy },
    JWT_SECRET(),
    { expiresIn: '24h' }
  );
  res.json({ token });
});

// Usuarios vinculados con personas RENIEC
router.get('/usuarios', auth, adminBotOnly, async (_req, res) => {
  try {
    const usuarios = await query(
      `SELECT u.id, u.usuario, u.rol, u.activo, u.ultimo_login, u.creado_en,
              p.dni, p.nombres, p.apellidos,
              GROUP_CONCAT(ub.bot_id ORDER BY ub.bot_id) AS bots
       FROM usuarios u
       LEFT JOIN personas p ON p.id = u.persona_id
       LEFT JOIN usuario_bots ub ON ub.usuario_id = u.id
       GROUP BY u.id, u.usuario, u.rol, u.activo, u.ultimo_login, u.creado_en,
                p.dni, p.nombres, p.apellidos
       ORDER BY u.creado_en DESC`
    );
    res.json(usuarios.map(u => ({ ...u, bots: u.bots ? u.bots.split(',') : [] })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/usuarios', auth, adminBotOnly, async (req, res) => {
  try {
    const { usuario, password, rol = 'cliente', dni, bot_ids = [] } = req.body || {};
    if (!usuario || !password) {
      return res.status(400).json({ error: 'usuario y password son requeridos' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'password debe tener al menos 8 caracteres' });
    }
    const rolesValidos = ['root', 'administrador', 'administrador_bot', 'cliente', 'admin', 'operador', 'consulta'];
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({ error: 'rol inválido' });
    }
    // Solo root puede crear otro root
    if (rol === 'root' && !esAdmin(req.user?.rol)) {
      return res.status(403).json({ error: 'Solo root puede crear usuarios root' });
    }

    let personaId = null;
    if (dni) {
      const persona = await buscarDNI(dni);
      if (!persona) return res.status(404).json({ error: 'DNI no encontrado en RENIEC ni en caché' });
      const row = await queryOne('SELECT id FROM personas WHERE dni = ?', [String(dni).trim()]);
      if (!row) return res.status(500).json({ error: 'No se pudo vincular el DNI con la persona' });
      personaId = row.id;
    }

    const result = await query(
      `INSERT INTO usuarios (persona_id, usuario, password_hash, rol)
       VALUES (?, ?, ?, ?)`,
      [personaId, usuario.trim(), hashPassword(password), rol]
    );
    const userId = result.insertId;

    for (const botId of bot_ids) {
      await query(
        'INSERT IGNORE INTO usuario_bots (usuario_id, bot_id) VALUES (?, ?)',
        [userId, botId]
      );
    }
    res.status(201).json({ ok: true, id: userId });
  } catch (err) {
    const status = err.code === 'ER_DUP_ENTRY' ? 409 : 500;
    res.status(status).json({ error: err.code === 'ER_DUP_ENTRY' ? 'Usuario o DNI ya vinculado' : err.message });
  }
});

router.put('/usuarios/:id', auth, adminBotOnly, async (req, res) => {
  try {
    const { activo, rol, bot_ids } = req.body || {}
    // No permite escalar a root salvo que sea root
    if (rol === 'root' && !esAdmin(req.user?.rol)) {
      return res.status(403).json({ error: 'Solo root puede asignar ese rol' })
    }
    if (activo !== undefined) {
      await query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, req.params.id])
    }
    if (rol) {
      await query('UPDATE usuarios SET rol = ? WHERE id = ?', [rol, req.params.id])
    }
    if (Array.isArray(bot_ids)) {
      await query('DELETE FROM usuario_bots WHERE usuario_id = ?', [req.params.id])
      for (const botId of bot_ids) {
        await query('INSERT IGNORE INTO usuario_bots (usuario_id, bot_id) VALUES (?, ?)', [req.params.id, botId])
      }
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/reniec/:dni', auth, async (req, res) => {
  if (!/^\d{8}$/.test(req.params.dni)) {
    return res.status(400).json({ error: 'El DNI debe contener 8 dígitos' });
  }
  const persona = await buscarDNI(req.params.dni);
  if (!persona) return res.status(404).json({ error: 'DNI no encontrado' });
  res.json({ dni: req.params.dni, ...persona });
});

// ─── ESTADÍSTICAS ────────────────────────────────────────────
router.get('/stats', auth, async (req, res) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];

    const [resumenHoy, ingresosHoy, pendientes, semana] = await Promise.all([
      queryOne(
        `SELECT COUNT(*) AS total, COUNT(DISTINCT phone) AS clientes
         FROM reservas WHERE fecha = ?`, [hoy]
      ),
      queryOne(
        `SELECT COALESCE(SUM(monto_reserva), 0) AS total
         FROM reservas WHERE estado = 'CONFIRMADA' AND DATE(creado_en) = ?`, [hoy]
      ),
      queryOne(
        `SELECT COUNT(*) AS total FROM reservas
         WHERE estado IN ('EN_REVISION','COMPROBANTE_ENVIADO')`
      ),
      query(
        `SELECT DATE(creado_en) AS dia, COUNT(*) AS reservas,
                COALESCE(SUM(monto_reserva),0) AS ingresos
         FROM reservas
         WHERE creado_en >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         GROUP BY dia ORDER BY dia`
      )
    ]);

    const porCancha = await query(
      `SELECT tipo_cancha, COUNT(*) AS total
       FROM reservas WHERE fecha = ? AND estado = 'CONFIRMADA'
       GROUP BY tipo_cancha`, [hoy]
    );

    res.json({
      reservas_hoy: resumenHoy?.total || 0,
      clientes_hoy: resumenHoy?.clientes || 0,
      ingresos_hoy: Number(ingresosHoy?.total || 0).toFixed(2),
      pagos_pendientes: pendientes?.total || 0,
      semana,
      por_cancha: porCancha
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── RESERVAS ────────────────────────────────────────────────
router.get('/reservas', auth, async (req, res) => {
  try {
    const { estado, fecha, buscar, limit = 50, offset = 0 } = req.query;
    const pageLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 200);
    const pageOffset = Math.max(Number.parseInt(offset, 10) || 0, 0);
    let sql = `SELECT * FROM reservas WHERE 1=1`;
    const params = [];

    if (estado) { sql += ` AND estado = ?`; params.push(estado); }
    if (fecha)  { sql += ` AND fecha = ?`; params.push(fecha); }
    if (buscar) {
      sql += ` AND (nombres LIKE ? OR apellidos LIKE ? OR dni LIKE ? OR id LIKE ?)`;
      const like = `%${buscar}%`;
      params.push(like, like, like, like);
    }

    // MySQL/mysql2 puede rechazar placeholders preparados para LIMIT/OFFSET.
    // Estos valores ya son enteros normalizados, por lo que es seguro interpolarlos.
    sql += ` ORDER BY creado_en DESC LIMIT ${pageLimit} OFFSET ${pageOffset}`;

    const reservas = await query(sql, params);
    reservas.forEach(r => {
      if (typeof r.horas === 'string') r.horas = JSON.parse(r.horas);
    });
    res.json(reservas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reservas/:id', auth, async (req, res) => {
  try {
    const r = await getReserva(req.params.id);
    if (!r) return res.status(404).json({ error: 'No encontrada' });
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reservas/:id/aprobar', auth, async (req, res) => {
  try {
    const reservaId = req.params.id;
    const reserva = await getReserva(reservaId);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });

    if (pagosPendientes[reservaId]?.timer) {
      clearTimeout(pagosPendientes[reservaId].timer);
      delete pagosPendientes[reservaId];
    }
    await eliminarPagoPendiente(reservaId);

    const horas = reserva.horasElegidas || reserva.horas || [];
    const resultados = await Promise.all(
      horas.map(h => intentarReservarSlot(reserva.fecha, h, reservaId))
    );

    if (!resultados.every(Boolean)) {
      await actualizarReserva(reservaId, { estado: 'CANCELADA_SLOTS_OCUPADOS' });
      await enviarTexto(reserva.phone,
        `❌ Lo sentimos, algunas horas ya no están disponibles.\n\n` +
        `Tu dinero será reembolsado. Escribe *MENU* para intentar de nuevo.`
      );
      return res.json({ ok: false, mensaje: 'Slots ocupados, reserva cancelada' });
    }

    await actualizarReserva(reservaId, { estado: 'CONFIRMADA' });
    await enviarTexto(reserva.phone,
      `🎉 *¡RESERVA CONFIRMADA!*\n\n✅ Pago verificado.\n\n` +
      `📋 ${reservaId}\n🏟️ ${reserva.tipoCancha}\n` +
      `📅 ${reserva.fechaDisplay}\n⏰ ${horas.join(', ')}\n\n` +
      `¡Te esperamos! ⚽🌿`
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reservas/:id/rechazar', auth, async (req, res) => {
  try {
    const reservaId = req.params.id;
    const reserva = await getReserva(reservaId);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });

    await actualizarReserva(reservaId, { estado: 'RECHAZADA' });
    await enviarTexto(reserva.phone,
      `❌ *Pago rechazado*\n\nNo pudimos confirmar tu pago de ${reservaId}.\n\n` +
      `Escribe *MENU* para intentar de nuevo. 😊`
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CONFIGURACIÓN ───────────────────────────────────────────
router.get('/config', auth, (req, res) => {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return res.json(JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')));
    }
    res.json(defaultConfig());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/config', auth, (req, res) => {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CLIENTES ────────────────────────────────────────────────
router.get('/clientes', auth, async (req, res) => {
  try {
    const clientes = await query(
      `SELECT p.dni, p.nombres, p.apellidos, p.fuente,
              COUNT(r.id) AS total_reservas,
              COALESCE(SUM(r.monto_reserva),0) AS total_gastado,
              MAX(r.creado_en) AS ultima_reserva
       FROM personas p
       LEFT JOIN reservas r ON r.dni = p.dni
       GROUP BY p.dni
       ORDER BY ultima_reserva DESC
       LIMIT 200`
    );
    res.json(clientes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SLOTS POR FECHA ─────────────────────────────────────────
router.get('/slots/:fecha', auth, async (req, res) => {
  try {
    const slots = await query(
      `SELECT s.hora, r.id AS reserva_id, r.nombres, r.apellidos,
              r.tipo_cancha, r.estado
       FROM slots_ocupados s
       LEFT JOIN reservas r ON r.id = s.reserva_id
       WHERE s.fecha = ?
       ORDER BY s.hora`, [req.params.fecha]
    );
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BOTS (CRUD MULTI-BOT) ───────────────────────────────────

const BOT_TEMPLATES = {
  grass: {
    precio_hora: 50, descuento_pago: 0.5, timeout_pago_minutos: 10,
    horarios: { apertura: '07:00', cierre: '22:00' },
    canchas: ['⚽ Fútbol', '🏐 Vóley', '🎉 Evento'],
    pagos: { yape: '', plin: '', titular: '' },
    mensajes: { bienvenida: '¡Bienvenido a las canchas de Grass Sintético!', confirmacion: '¡Reserva confirmada! Te esperamos.' }
  },
  comercio: {
    moneda: 'S/.', timeout_pedido_minutos: 30,
    horarios: { apertura: '09:00', cierre: '21:00' },
    categorias: ['General'],
    pagos: { yape: '', plin: '', titular: '' },
    delivery: false, delivery_costo: 0,
    mensajes: { bienvenida: '¡Bienvenido a nuestra tienda!', confirmacion: '¡Pedido confirmado! En breve lo procesamos.' }
  },
  restaurant: {
    moneda: 'S/.', timeout_reserva_minutos: 20,
    horarios: { apertura: '12:00', cierre: '22:00' },
    capacidad_mesa: 4, mesas_disponibles: 10,
    pagos: { yape: '', plin: '', titular: '' },
    delivery: true, delivery_costo: 5,
    mensajes: { bienvenida: '¡Bienvenido a nuestro restaurante!', confirmacion: '¡Mesa reservada! Te esperamos.' }
  }
};

router.get('/bots', auth, async (req, res) => {
  try {
    const bots = esAdminBot(req.user?.rol) || req.user.legacy
      ? await query('SELECT * FROM bots ORDER BY creado_en DESC')
      : await query(
          `SELECT b.*
           FROM bots b
           INNER JOIN usuario_bots ub ON ub.bot_id = b.id AND ub.usuario_id = ?
           ORDER BY b.creado_en DESC`,
          [req.user.id]
        );
    bots.forEach(b => {
      if (typeof b.config === 'string') b.config = JSON.parse(b.config);
    });
    res.json(bots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bots', auth, adminBotOnly, async (req, res) => {
  try {
    const { nombre, tipo, phone_number_id, admin_phone, plan } = req.body;
    if (!nombre || !tipo) return res.status(400).json({ error: 'nombre y tipo son requeridos' });

    const id = `BOT-${Date.now()}`;
    const config = BOT_TEMPLATES[tipo] || BOT_TEMPLATES.grass;

    await query(
      `INSERT INTO bots (id, nombre, tipo, phone_number_id, admin_phone, config, plan)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, nombre, tipo, phone_number_id || null, admin_phone || null, JSON.stringify(config), plan || 'demo']
    );
    if (req.user.id) {
      await query(
        'INSERT IGNORE INTO usuario_bots (usuario_id, bot_id) VALUES (?, ?)',
        [req.user.id, id]
      );
    }
    res.status(201).json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/bots/:id', auth, async (req, res) => {
  try {
    const bot = await queryOne('SELECT * FROM bots WHERE id = ?', [req.params.id]);
    if (!bot) return res.status(404).json({ error: 'Bot no encontrado' });
    if (typeof bot.config === 'string') bot.config = JSON.parse(bot.config);
    res.json(bot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/bots/:id', auth, async (req, res) => {
  try {
    const body = { ...req.body };

    // Clientes: solo pueden editar sus propios bots y campos permitidos
    if (esCliente(req.user?.rol)) {
      const asignado = await queryOne(
        'SELECT puede_editar FROM usuario_bots WHERE usuario_id = ? AND bot_id = ?',
        [req.user.id, req.params.id]
      );
      if (!asignado || !asignado.puede_editar) {
        return res.status(403).json({ error: 'Sin permiso para editar este bot' });
      }
      // Campos que el cliente NO puede modificar
      delete body.plan; delete body.plan_inicio; delete body.plan_expira;
      delete body.activo; delete body.phone_number_id; delete body.tipo;
    }

    const { nombre, phone_number_id, admin_phone, config, plan, plan_inicio, plan_expira, activo } = body;
    await query(
      `UPDATE bots SET
        nombre          = COALESCE(?, nombre),
        phone_number_id = COALESCE(?, phone_number_id),
        admin_phone     = COALESCE(?, admin_phone),
        config          = COALESCE(?, config),
        plan            = COALESCE(?, plan),
        plan_inicio     = COALESCE(?, plan_inicio),
        plan_expira     = COALESCE(?, plan_expira),
        activo          = COALESCE(?, activo)
       WHERE id = ?`,
      [
        nombre || null, phone_number_id || null, admin_phone || null,
        config ? JSON.stringify(config) : null,
        plan || null, plan_inicio || null, plan_expira || null,
        activo !== undefined ? activo : null,
        req.params.id
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/bots/:id', auth, adminBotOnly, async (req, res) => {
  try {
    await query('DELETE FROM bots WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/bots/templates/all', auth, (_req, res) => {
  res.json(BOT_TEMPLATES);
});

// ─── VERIFICAR CONEXIÓN WHATSAPP (plan anual/lifetime) ───────
// Llama a la API de Meta con el token y phone_number_id del cliente.
// Si es válido, guarda los datos y marca el bot como activo.
router.post('/bots/:id/verificar-conexion', auth, async (req, res) => {
  try {
    const bot = await queryOne('SELECT * FROM bots WHERE id = ?', [req.params.id]);
    if (!bot) return res.status(404).json({ error: 'Bot no encontrado' });

    const token         = req.body.waba_token     || bot.waba_token     || process.env.WHATSAPP_TOKEN;
    const phoneNumberId = req.body.phone_number_id || bot.phone_number_id;

    if (!token || !phoneNumberId) {
      return res.status(400).json({ error: 'Se requiere token y phone_number_id' });
    }

    const metaRes = await axios.get(
      `https://graph.facebook.com/v18.0/${phoneNumberId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params:  { fields: 'display_phone_number,verified_name,quality_rating' }
      }
    );

    const { display_phone_number, verified_name, quality_rating } = metaRes.data;

    await query(
      `UPDATE bots SET
         waba_token           = ?,
         phone_number_id      = ?,
         tipo_conexion        = 'propio',
         estado_conexion      = 'activo',
         webhook_configurado  = 1,
         numero_display       = ?,
         nombre_verificado    = ?,
         activo               = 1
       WHERE id = ?`,
      [token, phoneNumberId, display_phone_number, verified_name, req.params.id]
    );

    res.json({
      ok:      true,
      numero:  display_phone_number,
      nombre:  verified_name,
      calidad: quality_rating
    });
  } catch (err) {
    const apiErr = err.response?.data?.error;
    if (apiErr?.code === 190) return res.status(400).json({ error: 'Token inválido o expirado. Genera uno nuevo en Meta Business.' });
    if (apiErr?.code === 100) return res.status(400).json({ error: 'Phone Number ID incorrecto.' });
    res.status(500).json({ error: apiErr?.message || err.message });
  }
});

// ─── EMBEDDED SIGNUP (cliente conecta con botón Facebook) ────
router.post('/bots/:id/embedded-signup', auth, async (req, res) => {
  try {
    const { access_token, phone_number_id, waba_id } = req.body;
    if (!access_token) return res.status(400).json({ error: 'Se requiere access_token' });

    const bot = await queryOne('SELECT * FROM bots WHERE id = ?', [req.params.id]);
    if (!bot) return res.status(404).json({ error: 'Bot no encontrado' });

    let resolvedPhoneId = phone_number_id;

    // Si tenemos waba_id pero no phone_number_id, obtenerlo de la API
    if (waba_id && !resolvedPhoneId) {
      const wabaRes = await axios.get(
        `https://graph.facebook.com/v19.0/${waba_id}/phone_numbers`,
        {
          headers: { Authorization: `Bearer ${access_token}` },
          params:  { fields: 'id,display_phone_number,verified_name' }
        }
      );
      const phones = wabaRes.data?.data;
      if (!phones?.length) {
        return res.status(400).json({ error: 'No se encontraron números en esta cuenta de WhatsApp Business' });
      }
      resolvedPhoneId = phones[0].id;
    }

    if (!resolvedPhoneId) {
      return res.status(400).json({ error: 'No se pudo determinar el Phone Number ID. Intenta de nuevo.' });
    }

    // Verificar el número en Meta
    const phoneRes = await axios.get(
      `https://graph.facebook.com/v19.0/${resolvedPhoneId}`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
        params:  { fields: 'display_phone_number,verified_name,quality_rating' }
      }
    );
    const { display_phone_number, verified_name, quality_rating } = phoneRes.data;

    // Intentar suscribir el webhook automáticamente
    if (waba_id) {
      try {
        await axios.post(
          `https://graph.facebook.com/v19.0/${waba_id}/subscribed_apps`,
          {},
          { headers: { Authorization: `Bearer ${access_token}` } }
        );
      } catch (subErr) {
        console.warn('[EmbeddedSignup] No se pudo auto-suscribir webhook:', subErr.response?.data?.error?.message);
      }
    }

    await query(
      `UPDATE bots SET
         waba_token           = ?,
         phone_number_id      = ?,
         tipo_conexion        = 'propio',
         estado_conexion      = 'activo',
         webhook_configurado  = 1,
         numero_display       = ?,
         nombre_verificado    = ?,
         activo               = 1
       WHERE id = ?`,
      [access_token, resolvedPhoneId, display_phone_number, verified_name, req.params.id]
    );

    res.json({ ok: true, numero: display_phone_number, nombre: verified_name, calidad: quality_rating });
  } catch (err) {
    const apiErr = err.response?.data?.error;
    if (apiErr?.code === 190) return res.status(400).json({ error: 'Sesión expirada. Vuelve a intentar la conexión.' });
    if (apiErr?.code === 100) return res.status(400).json({ error: 'No se pudo acceder al número de WhatsApp.' });
    res.status(500).json({ error: apiErr?.message || err.message });
  }
});

// ─── VERIFICAR REGISTRO (flujo de reclamo) ───────────────────
// El cliente ya verificó su número manualmente en Meta Business Manager.
// Este endpoint consulta la lista de teléfonos del WABA y lo activa si lo encuentra.
router.post('/bots/:id/verificar-registro', auth, async (req, res) => {
  try {
    const bot = await queryOne('SELECT * FROM bots WHERE id = ?', [req.params.id]);
    if (!bot) return res.status(404).json({ error: 'Bot no encontrado' });

    // Verificar acceso: el usuario debe ser dueño del bot o adminBot+
    if (!esAdminBot(req.user?.rol)) {
      const asignado = await queryOne(
        'SELECT 1 FROM usuario_bots WHERE usuario_id = ? AND bot_id = ?',
        [req.user.id, req.params.id]
      );
      if (!asignado) return res.status(403).json({ error: 'Sin acceso a este bot' });
    }

    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Se requiere el número de teléfono' });

    const wabaId       = process.env.WABA_ID;
    const platformToken = process.env.WHATSAPP_TOKEN;

    if (!wabaId || !platformToken) {
      return res.status(500).json({ error: 'WABA_ID o WHATSAPP_TOKEN no configurados en el servidor' });
    }

    // Obtener todos los números registrados en el WABA
    const metaRes = await axios.get(
      `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers`,
      {
        headers: { Authorization: `Bearer ${platformToken}` },
        params:  { fields: 'id,display_phone_number,verified_name,quality_rating,status,code_verification_status' }
      }
    );

    const phones = metaRes.data?.data || [];

    // Normalizar el número buscado (solo dígitos, comparar al final)
    const searchDigits = String(phone).replace(/\D/g, '');
    const found = phones.find(p => {
      const pDigits = String(p.display_phone_number || '').replace(/\D/g, '');
      return pDigits.endsWith(searchDigits) || searchDigits.endsWith(pDigits)
    });

    if (!found) {
      return res.status(404).json({
        error: `El número ${phone} aún no aparece en tu cuenta de Meta. Asegúrate de haber completado la verificación por SMS en Meta Business Manager.`,
        phones_found: phones.map(p => p.display_phone_number)
      });
    }

    // Activar el bot con este número
    await query(
      `UPDATE bots SET
         phone_number_id      = ?,
         tipo_conexion        = 'propio',
         estado_conexion      = 'activo',
         webhook_configurado  = 1,
         numero_display       = ?,
         nombre_verificado    = ?,
         activo               = 1
       WHERE id = ?`,
      [found.id, found.display_phone_number, found.verified_name || '', req.params.id]
    );

    res.json({
      ok:      true,
      numero:  found.display_phone_number,
      nombre:  found.verified_name,
      calidad: found.quality_rating,
      estado:  found.status
    });
  } catch (err) {
    const apiErr = err.response?.data?.error;
    if (apiErr?.code === 190) {
      return res.status(400).json({ error: 'Token del servidor inválido. Contacta al administrador.' });
    }
    if (apiErr?.code === 10) {
      return res.status(400).json({ error: 'El token del servidor no tiene permisos para listar números. Configura un System User Token con permiso whatsapp_business_management.' });
    }
    res.status(500).json({ error: apiErr?.message || err.message });
  }
});

// ─── TOGGLE ACTIVO (administrador+) ─────────────────────────
router.post('/bots/:id/toggle-activo', auth, adminOnly, async (req, res) => {
  try {
    const bot = await queryOne('SELECT id, activo FROM bots WHERE id = ?', [req.params.id]);
    if (!bot) return res.status(404).json({ error: 'Bot no encontrado' });
    await query('UPDATE bots SET activo = ? WHERE id = ?', [bot.activo ? 0 : 1, req.params.id]);
    res.json({ ok: true, activo: !bot.activo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ASIGNAR BOT A CLIENTE ───────────────────────────────────
router.post('/bots/:id/asignar-cliente', auth, adminBotOnly, async (req, res) => {
  try {
    const { usuario_id, puede_editar = 1, puede_ver_stats = 0 } = req.body;
    if (!usuario_id) return res.status(400).json({ error: 'usuario_id requerido' });
    await query(
      `INSERT INTO usuario_bots (usuario_id, bot_id, puede_editar, puede_ver_stats)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE puede_editar = VALUES(puede_editar), puede_ver_stats = VALUES(puede_ver_stats)`,
      [usuario_id, req.params.id, puede_editar ? 1 : 0, puede_ver_stats ? 1 : 0]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── STATS ADMINISTRATIVAS (administrador+) ──────────────────
router.get('/stats/admin', auth, adminOnly, async (_req, res) => {
  try {
    const [botsActivos, clientesTotal, ingresosUltimos30, distribucion] = await Promise.all([
      queryOne('SELECT COUNT(*) AS total FROM bots WHERE activo = 1'),
      queryOne('SELECT COUNT(*) AS total FROM usuarios WHERE rol = "cliente" AND activo = 1'),
      queryOne(`
        SELECT COALESCE(SUM(monto_reserva), 0) AS total
        FROM reservas
        WHERE estado = 'CONFIRMADA' AND creado_en >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `),
      query(`
        SELECT b.plan, COUNT(*) AS total
        FROM bots b
        WHERE b.activo = 1
        GROUP BY b.plan
      `)
    ]);

    const tendencia = await query(`
      SELECT DATE(creado_en) AS dia,
             COUNT(*) AS reservas,
             COALESCE(SUM(monto_reserva),0) AS ingresos
      FROM reservas
      WHERE creado_en >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY dia ORDER BY dia
    `);

    res.json({
      bots_activos: botsActivos?.total || 0,
      clientes_total: clientesTotal?.total || 0,
      ingresos_30d: Number(ingresosUltimos30?.total || 0).toFixed(2),
      distribucion_planes: distribucion,
      tendencia_30d: tendencia
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ASIGNAR NÚMERO GESTIONADO (administrador_bot+) ──────────
// El admin asigna un phone_number_id del pool a un bot de plan mensual.
router.post('/bots/:id/asignar-numero', auth, adminBotOnly, async (req, res) => {
  try {
    const { phone_number_id, numero_display } = req.body;
    if (!phone_number_id) return res.status(400).json({ error: 'phone_number_id requerido' });

    await query(
      `UPDATE bots SET
         phone_number_id   = ?,
         numero_display    = ?,
         tipo_conexion     = 'gestionado',
         estado_conexion   = 'activo',
         activo            = 1
       WHERE id = ?`,
      [phone_number_id, numero_display || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BOTS PENDIENTES DE ACTIVACIÓN (administrador_bot+) ──────
router.get('/bots/pendientes', auth, adminBotOnly, async (_req, res) => {
  try {
    const bots = await query(
      `SELECT b.*, u.usuario
       FROM bots b
       LEFT JOIN usuario_bots ub ON ub.bot_id = b.id
       LEFT JOIN usuarios u ON u.id = ub.usuario_id
       WHERE b.estado_conexion = 'pendiente'
       ORDER BY b.creado_en DESC`
    );
    bots.forEach(b => {
      if (typeof b.config === 'string') b.config = JSON.parse(b.config);
    });
    res.json(bots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── UTILIDAD: LISTAR NÚMEROS DEL WABA (solo root) ───────────
// Ayuda al admin a verificar qué números tiene registrados en Meta
// y a descubrir el WABA_ID si aún no lo tiene configurado.
router.get('/meta/numeros', auth, rootOnly, async (_req, res) => {
  try {
    const wabaId       = process.env.WABA_ID;
    const platformToken = process.env.WHATSAPP_TOKEN;

    if (!platformToken) {
      return res.status(500).json({ error: 'WHATSAPP_TOKEN no configurado' });
    }

    if (!wabaId || wabaId === 'AQUI_TU_WABA_ID') {
      return res.status(400).json({
        error: 'WABA_ID no configurado en .env',
        instrucciones: [
          '1. Ve a business.facebook.com',
          '2. Haz clic en "Configuración" (engranaje abajo a la izquierda)',
          '3. Selecciona "Cuentas de WhatsApp" en el menú lateral',
          '4. El número de ID que aparece es tu WABA_ID',
          '5. Cópialo y ponlo en WABA_ID= en el archivo .env'
        ]
      });
    }

    const metaRes = await axios.get(
      `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers`,
      {
        headers: { Authorization: `Bearer ${platformToken}` },
        params:  { fields: 'id,display_phone_number,verified_name,status,quality_rating,code_verification_status' }
      }
    );

    res.json({
      waba_id: wabaId,
      numeros: metaRes.data?.data || []
    });
  } catch (err) {
    const apiErr = err.response?.data?.error;
    res.status(500).json({ error: apiErr?.message || err.message, code: apiErr?.code });
  }
});

// ─── CONFIG POR DEFECTO ──────────────────────────────────────
function defaultConfig() {
  return {
    bot_nombre: 'Grass Sintético Bot',
    precio_hora: 50,
    descuento_pago: 0.5,
    timeout_pago_minutos: 10,
    horarios: { apertura: '07:00', cierre: '22:00' },
    pagos: {
      yape: process.env.PAYMENT_YAPE || '',
      plin: process.env.PAYMENT_PLIN || '',
      titular: process.env.PAYMENT_ACCOUNT || ''
    },
    mensajes: {
      bienvenida: '¡Bienvenido al sistema de reservas de Grass Sintético!',
      pago_confirmado: '¡Tu reserva ha sido confirmada! ¡Te esperamos!',
      pago_rechazado: 'No pudimos confirmar tu pago. Por favor intenta de nuevo.'
    }
  };
}

export default router;
