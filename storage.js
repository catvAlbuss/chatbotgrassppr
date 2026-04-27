// ============================================================
// storage.js - Almacenamiento persistente con MySQL
// Todas las funciones son async/await
// ============================================================
import { query, queryOne } from './db.js';

// Los timers de pago se mantienen en memoria (son efímeros por diseño)
export const pagosPendientes = {};

// ─── ESTADO DE CONVERSACIÓN ────────────────────────────────

/**
 * Obtiene el estado de conversación de un usuario.
 * Si no existe, lo crea en estado INICIO.
 */
export async function getEstado(phone) {
  try {
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

    // No existe → insertar estado inicial
    await query(
      `INSERT INTO conversaciones (phone, estado, datos, historial)
       VALUES (?, 'INICIO', '{}', '[]')
       ON DUPLICATE KEY UPDATE phone = phone`,
      [phone]
    );
    return { estado: 'INICIO', datos: {}, historial: [] };

  } catch (err) {
    console.error('❌ getEstado error:', err.message);
    return { estado: 'INICIO', datos: {}, historial: [] };
  }
}

/**
 * Actualiza el estado y/o datos de la conversación.
 * Los datos nuevos se MEZCLAN con los existentes (merge).
 */
export async function setEstado(phone, estado, nuevosDatos = {}) {
  try {
    const conv = await getEstado(phone);
    const datosMezclados = { ...conv.datos, ...nuevosDatos };

    await query(
      `INSERT INTO conversaciones (phone, estado, datos, historial)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         estado   = VALUES(estado),
         datos    = VALUES(datos)`,
      [phone, estado, JSON.stringify(datosMezclados), JSON.stringify(conv.historial)]
    );
  } catch (err) {
    console.error('❌ setEstado error:', err.message);
  }
}

/**
 * Resetea la conversación a estado INICIO limpio.
 */
export async function resetEstado(phone) {
  try {
    await query(
      `INSERT INTO conversaciones (phone, estado, datos, historial)
       VALUES (?, 'INICIO', '{}', '[]')
       ON DUPLICATE KEY UPDATE
         estado    = 'INICIO',
         datos     = '{}',
         historial = '[]'`,
      [phone]
    );
  } catch (err) {
    console.error('❌ resetEstado error:', err.message);
  }
}

/**
 * Agrega un mensaje al historial de la conversación (para OpenAI).
 */
export async function agregarHistorial(phone, role, content) {
  try {
    const conv = await getEstado(phone);
    const historial = [...conv.historial, { role, content }];
    // Mantener solo los últimos 20 mensajes para no inflar el contexto
    const reciente = historial.slice(-20);

    await query(
      'UPDATE conversaciones SET historial = ? WHERE phone = ?',
      [JSON.stringify(reciente), phone]
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

/**
 * Retorna las horas disponibles para una fecha dada.
 */
export async function getSlotsDisponibles(fecha) {
  try {
    const ocupados = await query(
      'SELECT hora FROM slots_ocupados WHERE fecha = ?',
      [fecha]
    );
    const horasOcupadas = ocupados.map(r => r.hora);
    return TODAS_LAS_HORAS.filter(h => !horasOcupadas.includes(h));
  } catch (err) {
    console.error('❌ getSlotsDisponibles error:', err.message);
    return TODAS_LAS_HORAS; // fallback: mostrar todas si falla BD
  }
}

/**
 * Verifica si un slot específico está ocupado.
 */
export async function isSlotOcupado(fecha, hora) {
  try {
    const row = await queryOne(
      'SELECT id FROM slots_ocupados WHERE fecha = ? AND hora = ?',
      [fecha, hora]
    );
    return !!row;
  } catch (err) {
    console.error('❌ isSlotOcupado error:', err.message);
    return false;
  }
}

/**
 * Intenta reservar un slot de forma ATÓMICA (evita race condition).
 * Retorna true si logró reservarlo, false si ya estaba ocupado.
 */
export async function intentarReservarSlot(fecha, hora, reservaId = null) {
  try {
    // INSERT IGNORE fallará silenciosamente si ya existe (unique constraint)
    const resultado = await query(
      `INSERT IGNORE INTO slots_ocupados (fecha, hora, reserva_id)
       VALUES (?, ?, ?)`,
      [fecha, hora, reservaId]
    );
    // Si affectedRows > 0, significa que se insertó exitosamente
    return resultado.affectedRows > 0;
  } catch (err) {
    console.error(`❌ intentarReservarSlot error (${fecha} ${hora}):`, err.message);
    return false;
  }
}

/**
 * Marca uno o varios slots como ocupados (al confirmar reserva).
 */
export async function marcarSlotOcupado(fecha, horas, reservaId = null) {
  const lista = Array.isArray(horas) ? horas : [horas];
  for (const hora of lista) {
    try {
      await query(
        `INSERT IGNORE INTO slots_ocupados (fecha, hora, reserva_id)
         VALUES (?, ?, ?)`,
        [fecha, hora, reservaId]
      );
    } catch (err) {
      console.error(`❌ marcarSlotOcupado error (${fecha} ${hora}):`, err.message);
    }
  }
}

// ─── RESERVAS ─────────────────────────────────────────────

/**
 * Crea una nueva reserva en la BD y retorna su ID.
 */
export async function crearReserva(phone, datos) {
  const id = `RES-${Date.now()}`;
  try {
    await query(
      `INSERT INTO reservas
         (id, phone, dni, nombres, apellidos, tipo_cancha,
          fecha, fecha_display, fecha_nombre, horas,
          costo_total, monto_reserva, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE_PAGO')`,
      [
        id,
        phone,
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
  } catch (err) {
    console.error('❌ crearReserva error:', err.message);
  }
  return id;
}

/**
 * Obtiene una reserva por su ID.
 */
export async function getReserva(id) {
  try {
    const row = await queryOne(
      'SELECT * FROM reservas WHERE id = ?',
      [id]
    );
    if (!row) return null;

    // Parsear horas (JSON string → array)
    if (typeof row.horas === 'string') row.horas = JSON.parse(row.horas);
    // Alias por compatibilidad con código existente
    row.horasElegidas = row.horas;
    row.tipoCancha = row.tipo_cancha;
    row.fechaDisplay = row.fecha_display;
    row.fechaNombre = row.fecha_nombre;
    row.montoReserva = parseFloat(row.monto_reserva);
    row.costoTotal = parseFloat(row.costo_total);
    row.numeroOperacion = row.numero_op;

    return row;
  } catch (err) {
    console.error('❌ getReserva error:', err.message);
    return null;
  }
}

/**
 * Actualiza campos de una reserva existente.
 */
export async function actualizarReserva(id, datos) {
  // Mapeo de claves del código a columnas MySQL
  const camposPermitidos = {
    estado: 'estado',
    numeroOperacion: 'numero_op',
    comprobanteImageId: 'comprobante_id'
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

  values.push(id); // para el WHERE
  try {
    await query(
      `UPDATE reservas SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );
  } catch (err) {
    console.error('❌ actualizarReserva error:', err.message);
  }
}

// ─── PAGOS PENDIENTES (BD) ────────────────────────────────

/**
 * Registra un pago pendiente con tiempo de expiración en la BD.
 */
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

/**
 * Elimina un pago pendiente de la BD (al aprobar/rechazar).
 */
export async function eliminarPagoPendiente(reservaId) {
  try {
    await query('DELETE FROM pagos_pendientes WHERE reserva_id = ?', [reservaId]);
  } catch (err) {
    console.error('❌ eliminarPagoPendiente error:', err.message);
  }
}
