// ============================================================
// storage.js - Almacenamiento en memoria
// (En producción reemplazar con base de datos)
// ============================================================

// Estado de conversación por usuario
export const conversaciones = {};

// Reservas registradas
export const reservas = {};

// Slots ocupados: { "2024-12-25": ["08:00", "09:00", "10:00"] }
export const slotsOcupados = {};

// Pagos pendientes de confirmación
export const pagosPendientes = {};

// ─── FUNCIONES DE ESTADO DE CONVERSACIÓN ───────────────────

export function getEstado(phone) {
  if (!conversaciones[phone]) {
    conversaciones[phone] = {
      estado: 'INICIO',
      datos: {},
      historial: []
    };
  }
  return conversaciones[phone];
}

export function setEstado(phone, estado, datos = {}) {
  if (!conversaciones[phone]) getEstado(phone);
  conversaciones[phone].estado = estado;
  conversaciones[phone].datos = { ...conversaciones[phone].datos, ...datos };
}

export function resetEstado(phone) {
  conversaciones[phone] = {
    estado: 'INICIO',
    datos: {},
    historial: []
  };
}

// ─── FUNCIONES DE SLOTS ────────────────────────────────────

export function isSlotOcupado(fecha, hora) {
  return slotsOcupados[fecha]?.includes(hora) || false;
}

export function marcarSlotOcupado(fecha, horas) {
  if (!slotsOcupados[fecha]) slotsOcupados[fecha] = [];
  if (Array.isArray(horas)) {
    slotsOcupados[fecha].push(...horas);
  } else {
    slotsOcupados[fecha].push(horas);
  }
}

export function getSlotsDisponibles(fecha) {
  const todasLasHoras = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
    '19:00', '20:00', '21:00', '22:00'
  ];
  const ocupados = slotsOcupados[fecha] || [];
  return todasLasHoras.filter(h => !ocupados.includes(h));
}

// ─── FUNCIONES DE RESERVAS ────────────────────────────────

export function crearReserva(phone, datos) {
  const id = `RES-${Date.now()}`;
  reservas[id] = {
    id,
    phone,
    ...datos,
    estado: 'PENDIENTE_PAGO',
    fechaCreacion: new Date().toISOString(),
    timerPago: null
  };
  return id;
}

export function getReserva(id) {
  return reservas[id];
}

export function actualizarReserva(id, datos) {
  if (reservas[id]) {
    reservas[id] = { ...reservas[id], ...datos };
  }
}
