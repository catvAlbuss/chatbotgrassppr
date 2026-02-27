// ============================================================
// storage.js - Almacenamiento persistente con MySQL
// Si MySQL no disponible → usa Maps en memoria como fallback
// ============================================================
import { query, queryOne } from './db.js';

// ─── MEMORIA FALLBACK ─────────────────────────────────────
// Se usa cuando MySQL no está configurado o falla
const memConversaciones = new Map();
const memReservas = new Map();
const memSlotsOcupados = new Map(); // key: "fecha|hora"

// Los timers de pago siempre en memoria (son efímeros)
export const pagosPendientes = {};

// ─── ESTADO DE CONVERSACIÓN ────────────────────────────────

export async function getEstado(phone) {
  // Intentar BD
  const row = await queryOne(
    'SELECT estado, datos, historial FROM conversaciones WHERE phone = ?',
    [phone]
  );

  if (row) {
    return {
      estado: row.estado,
      datos: row.datos ? (typeof row.datos === 'object' ? row.datos : JSON.parse(row.datos)) : {},
      historial: row.historial ? (typeof row.historial === 'object' ? row.historial : JSON.parse(row.historial)) : []
    };
  }

  // Fallback memoria
  if (memConversaciones.has(phone)) return memConversaciones.get(phone);
  return { estado: 'INICIO', datos: {}, historial: [] };
}

export async function setEstado(phone, estado, nuevosDatos = {}) {
  const conv = await getEstado(phone);
  const datosMezclados = { ...conv.datos, ...nuevosDatos };
  const nuevo = { estado, datos: datosMezclados, historial: conv.historial };

  // Intentar BD
  await query(
    `INSERT INTO conversaciones (phone, estado, datos, historial)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE estado = VALUES(estado), datos = VALUES(datos)`,
    [phone, estado, JSON.stringify(datosMezclados), JSON.stringify(conv.historial)]
  );

  // Siempre actualizar memoria (útil si BD no disponible)
  memConversaciones.set(phone, nuevo);
}

export async function resetEstado(phone) {
  const limpio = { estado: 'INICIO', datos: {}, historial: [] };
  memConversaciones.set(phone, limpio);

  await query(
    `INSERT INTO conversaciones (phone, estado, datos, historial)
     VALUES (?, 'INICIO', '{}', '[]')
     ON DUPLICATE KEY UPDATE estado='INICIO', datos='{}', historial='[]'`,
    [phone]
  );
}

export async function agregarHistorial(phone, role, content) {
  const conv = await getEstado(phone);
  const historial = [...(conv.historial || []), { role, content }].slice(-20);
  const actualizado = { ...conv, historial };
  memConversaciones.set(phone, actualizado);

  await query(
    'UPDATE conversaciones SET historial = ? WHERE phone = ?',
    [JSON.stringify(historial), phone]
  );
}

// ─── SLOTS DE DISPONIBILIDAD ───────────────────────────────

const TODAS_LAS_HORAS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'
];

export async function getSlotsDisponibles(fecha) {
  const rows = await query(
    'SELECT hora FROM slots_ocupados WHERE fecha = ?',
    [fecha]
  );

  // Combinar BD + memoria
  const ocupadosBD = rows ? rows.map(r => r.hora) : [];
  const ocupadosMem = [...memSlotsOcupados.entries()]
    .filter(([k]) => k.startsWith(fecha + '|'))
    .map(([k]) => k.split('|')[1]);

  const ocupados = [...new Set([...ocupadosBD, ...ocupadosMem])];
  return TODAS_LAS_HORAS.filter(h => !ocupados.includes(h));
}

export async function isSlotOcupado(fecha, hora) {
  if (memSlotsOcupados.has(`${fecha}|${hora}`)) return true;

  const row = await queryOne(
    'SELECT id FROM slots_ocupados WHERE fecha = ? AND hora = ?',
    [fecha, hora]
  );
  return !!row;
}

export async function marcarSlotOcupado(fecha, horas, reservaId = null) {
  const lista = Array.isArray(horas) ? horas : [horas];
  for (const hora of lista) {
    memSlotsOcupados.set(`${fecha}|${hora}`, reservaId);
    await query(
      'INSERT IGNORE INTO slots_ocupados (fecha, hora, reserva_id) VALUES (?, ?, ?)',
      [fecha, hora, reservaId]
    );
  }
}

// ─── RESERVAS ─────────────────────────────────────────────

export async function crearReserva(phone, datos) {
  const id = `RES-${Date.now()}`;

  memReservas.set(id, {
    id, phone,
    ...datos,
    estado: 'PENDIENTE_PAGO',
    creado_en: new Date().toISOString()
  });

  await query(
    `INSERT INTO reservas
       (id, phone, dni, nombres, apellidos, tipo_cancha,
        fecha, fecha_display, fecha_nombre, horas,
        costo_total, monto_reserva, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE_PAGO')`,
    [
      id, phone,
      datos.dni || null,
      datos.nombres || null,
      datos.apellidos || null,
      datos.tipoCancha || null,
      datos.fecha || null,
      datos.fechaDisplay || null,
      datos.fechaNombre || null,
      JSON.stringify(datos.horasElegidas || []),
      datos.costoTotal || 0,
      datos.montoReserva || 0
    ]
  );

  console.log(`📋 Reserva creada: ${id}`);
  return id;
}

export async function getReserva(id) {
  // Primero memoria (más rápido)
  if (memReservas.has(id)) return memReservas.get(id);

  const row = await queryOne('SELECT * FROM reservas WHERE id = ?', [id]);
  if (!row) return null;

  // Normalizar aliases para compatibilidad
  if (typeof row.horas === 'string') row.horas = JSON.parse(row.horas);
  row.horasElegidas = row.horas;
  row.tipoCancha = row.tipo_cancha;
  row.fechaDisplay = row.fecha_display;
  row.fechaNombre = row.fecha_nombre;
  row.montoReserva = parseFloat(row.monto_reserva);
  row.costoTotal = parseFloat(row.costo_total);
  row.numeroOperacion = row.numero_op;

  memReservas.set(id, row); // cachear en memoria
  return row;
}

export async function actualizarReserva(id, datos) {
  // Actualizar en memoria
  if (memReservas.has(id)) {
    const r = memReservas.get(id);
    memReservas.set(id, { ...r, ...datos });
  }

  const camposPermitidos = {
    estado: 'estado',
    numeroOperacion: 'numero_op',
    comprobanteImageId: 'comprobante_id'
  };

  const sets = [];
  const values = [];
  for (const [key, col] of Object.entries(camposPermitidos)) {
    if (datos[key] !== undefined) {
      sets.push(`\`${col}\` = ?`);
      values.push(datos[key]);
    }
  }
  if (sets.length === 0) return;

  values.push(id);
  await query(`UPDATE reservas SET ${sets.join(', ')} WHERE id = ?`, values);
}

// ─── PAGOS PENDIENTES ─────────────────────────────────────

export async function registrarPagoPendiente(reservaId, phone, minutos = 10) {
  const expira = new Date(Date.now() + minutos * 60 * 1000);
  await query(
    `INSERT INTO pagos_pendientes (reserva_id, phone, expira_en)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE expira_en = VALUES(expira_en)`,
    [reservaId, phone, expira]
  );
}

export async function eliminarPagoPendiente(reservaId) {
  await query('DELETE FROM pagos_pendientes WHERE reserva_id = ?', [reservaId]);
}
