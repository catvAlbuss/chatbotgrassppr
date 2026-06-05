// ============================================================
// storage.js - Almacenamiento persistente con MySQL
// Multi-tenant: todas las funciones de conversación reciben botId
// ============================================================
import { query, queryOne } from './db.js';

export const pagosPendientes = {};

// ─── ESTADO DE CONVERSACIÓN ────────────────────────────────

export async function getEstado(phone, botId = 'default') {
  try {
    const row = await queryOne(
      'SELECT estado, datos, historial FROM conversaciones WHERE bot_id = ? AND phone = ?',
      [botId, phone]
    );
    if (row) {
      return {
        estado:   row.estado,
        datos:    row.datos    ? (typeof row.datos    === 'object' ? row.datos    : JSON.parse(row.datos))    : {},
        historial: row.historial ? (typeof row.historial === 'object' ? row.historial : JSON.parse(row.historial)) : []
      };
    }
    await query(
      `INSERT INTO conversaciones (bot_id, phone, estado, datos, historial)
       VALUES (?, ?, 'INICIO', '{}', '[]')
       ON DUPLICATE KEY UPDATE phone = phone`,
      [botId, phone]
    );
    return { estado: 'INICIO', datos: {}, historial: [] };
  } catch (err) {
    console.error('❌ getEstado error:', err.message);
    return { estado: 'INICIO', datos: {}, historial: [] };
  }
}

export async function setEstado(phone, estado, nuevosDatos = {}, botId = 'default') {
  try {
    const conv = await getEstado(phone, botId);
    const datosMezclados = { ...conv.datos, ...nuevosDatos };
    await query(
      `INSERT INTO conversaciones (bot_id, phone, estado, datos, historial)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         estado = VALUES(estado),
         datos  = VALUES(datos)`,
      [botId, phone, estado, JSON.stringify(datosMezclados), JSON.stringify(conv.historial)]
    );
  } catch (err) {
    console.error('❌ setEstado error:', err.message);
  }
}

export async function resetEstado(phone, botId = 'default') {
  try {
    await query(
      `INSERT INTO conversaciones (bot_id, phone, estado, datos, historial)
       VALUES (?, ?, 'INICIO', '{}', '[]')
       ON DUPLICATE KEY UPDATE
         estado    = 'INICIO',
         datos     = '{}',
         historial = '[]'`,
      [botId, phone]
    );
  } catch (err) {
    console.error('❌ resetEstado error:', err.message);
  }
}

export async function agregarHistorial(phone, role, content, botId = 'default') {
  try {
    const conv = await getEstado(phone, botId);
    const historial = [...conv.historial, { role, content }].slice(-20);
    await query(
      'UPDATE conversaciones SET historial = ? WHERE bot_id = ? AND phone = ?',
      [JSON.stringify(historial), botId, phone]
    );
  } catch (err) {
    console.error('❌ agregarHistorial error:', err.message);
  }
}

// ─── SLOTS DE DISPONIBILIDAD ───────────────────────────────

const TODAS_LAS_HORAS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00', '22:00'
];

export async function getSlotsDisponibles(fecha, botId = 'default') {
  try {
    const ocupados = await query(
      'SELECT hora FROM slots_ocupados WHERE fecha = ? AND bot_id = ?',
      [fecha, botId]
    );
    const horasOcupadas = ocupados.map(r => r.hora);
    return TODAS_LAS_HORAS.filter(h => !horasOcupadas.includes(h));
  } catch (err) {
    // Fallback: intentar sin bot_id (tabla aún no migrada)
    try {
      const ocupados = await query('SELECT hora FROM slots_ocupados WHERE fecha = ?', [fecha]);
      return TODAS_LAS_HORAS.filter(h => !ocupados.map(r => r.hora).includes(h));
    } catch {
      return TODAS_LAS_HORAS;
    }
  }
}

export async function isSlotOcupado(fecha, hora, botId = 'default') {
  try {
    const row = await queryOne(
      'SELECT id FROM slots_ocupados WHERE fecha = ? AND hora = ? AND bot_id = ?',
      [fecha, hora, botId]
    );
    return !!row;
  } catch (err) {
    // Fallback sin bot_id
    try {
      const row = await queryOne(
        'SELECT id FROM slots_ocupados WHERE fecha = ? AND hora = ?',
        [fecha, hora]
      );
      return !!row;
    } catch {
      return false;
    }
  }
}

export async function intentarReservarSlot(fecha, hora, reservaId = null, botId = 'default') {
  try {
    const resultado = await query(
      `INSERT IGNORE INTO slots_ocupados (fecha, hora, reserva_id, bot_id)
       VALUES (?, ?, ?, ?)`,
      [fecha, hora, reservaId, botId]
    );
    return resultado.affectedRows > 0;
  } catch (err) {
    // Fallback sin bot_id (columna aún no migrada)
    try {
      const resultado = await query(
        `INSERT IGNORE INTO slots_ocupados (fecha, hora, reserva_id) VALUES (?, ?, ?)`,
        [fecha, hora, reservaId]
      );
      return resultado.affectedRows > 0;
    } catch (e2) {
      console.error(`❌ intentarReservarSlot error:`, e2.message);
      return false;
    }
  }
}

export async function marcarSlotOcupado(fecha, horas, reservaId = null, botId = 'default') {
  const lista = Array.isArray(horas) ? horas : [horas];
  for (const hora of lista) {
    await intentarReservarSlot(fecha, hora, reservaId, botId);
  }
}

// ─── RESERVAS ─────────────────────────────────────────────

export async function crearReserva(phone, datos, botId = 'default') {
  const id = `RES-${Date.now()}`;
  try {
    await query(
      `INSERT INTO reservas
         (id, bot_id, phone, dni, nombres, apellidos, tipo_cancha,
          fecha, fecha_display, fecha_nombre, horas,
          costo_total, monto_reserva, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE_PAGO')`,
      [
        id, botId, phone,
        datos.dni       || null,
        datos.nombres   || null,
        datos.apellidos || null,
        datos.tipoCancha  || null,
        datos.fecha       || null,
        datos.fechaDisplay || null,
        datos.fechaNombre  || null,
        JSON.stringify(datos.horasElegidas || []),
        datos.costoTotal   || 0,
        datos.montoReserva || 0
      ]
    );
    console.log(`📋 Reserva creada: ${id} (bot: ${botId})`);
  } catch (err) {
    // Fallback sin bot_id (columna aún no migrada)
    try {
      await query(
        `INSERT INTO reservas
           (id, phone, dni, nombres, apellidos, tipo_cancha,
            fecha, fecha_display, fecha_nombre, horas,
            costo_total, monto_reserva, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE_PAGO')`,
        [
          id, phone,
          datos.dni || null, datos.nombres || null, datos.apellidos || null,
          datos.tipoCancha || null, datos.fecha || null,
          datos.fechaDisplay || null, datos.fechaNombre || null,
          JSON.stringify(datos.horasElegidas || []),
          datos.costoTotal || 0, datos.montoReserva || 0
        ]
      );
      console.log(`📋 Reserva creada (fallback): ${id}`);
    } catch (e2) {
      console.error('❌ crearReserva error:', e2.message);
    }
  }
  return id;
}

export async function getReserva(id) {
  try {
    const row = await queryOne('SELECT * FROM reservas WHERE id = ?', [id]);
    if (!row) return null;
    if (typeof row.horas === 'string') row.horas = JSON.parse(row.horas);
    row.horasElegidas  = row.horas;
    row.tipoCancha     = row.tipo_cancha;
    row.fechaDisplay   = row.fecha_display;
    row.fechaNombre    = row.fecha_nombre;
    row.montoReserva   = parseFloat(row.monto_reserva);
    row.costoTotal     = parseFloat(row.costo_total);
    row.numeroOperacion = row.numero_op;
    return row;
  } catch (err) {
    console.error('❌ getReserva error:', err.message);
    return null;
  }
}

export async function actualizarReserva(id, datos) {
  const camposPermitidos = {
    estado:              'estado',
    numeroOperacion:     'numero_op',
    comprobanteImageId:  'comprobante_id'
  };
  const setClauses = [];
  const values = [];
  for (const [key, col] of Object.entries(camposPermitidos)) {
    if (datos[key] !== undefined) {
      setClauses.push(`\`${col}\` = ?`);
      values.push(datos[key]);
    }
  }
  if (setClauses.length === 0) return;
  values.push(id);
  try {
    await query(`UPDATE reservas SET ${setClauses.join(', ')} WHERE id = ?`, values);
  } catch (err) {
    console.error('❌ actualizarReserva error:', err.message);
  }
}

// ─── PAGOS PENDIENTES ─────────────────────────────────────

export async function registrarPagoPendiente(reservaId, phone, minutos = 10) {
  const expira = new Date(Date.now() + minutos * 60 * 1000);
  try {
    await query(
      `INSERT INTO pagos_pendientes (reserva_id, phone, expira_en)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE expira_en = VALUES(expira_en)`,
      [reservaId, phone, expira]
    );
  } catch (err) {
    console.error('❌ registrarPagoPendiente error:', err.message);
  }
}

export async function eliminarPagoPendiente(reservaId) {
  try {
    await query('DELETE FROM pagos_pendientes WHERE reserva_id = ?', [reservaId]);
  } catch (err) {
    console.error('❌ eliminarPagoPendiente error:', err.message);
  }
}
