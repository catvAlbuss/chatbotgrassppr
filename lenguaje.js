// ============================================================
// lenguaje.js - Procesamiento de lenguaje natural AMPLIO
// Perú: jerga local, abreviaciones, errores tipográficos,
// textos informales, voz coloquial
// ============================================================

/**
 * Normaliza texto: minúsculas, sin tildes, sin puntuación extra
 */
export function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[^a-z0-9\s]/g, ' ')   // quitar puntuación
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── SALUDOS ─────────────────────────────────────────────
// Incluye jerga peruana, abreviaturas, errores, palabras compuestas
const PALABRAS_SALUDO = [
  // Estándar
  'hola', 'ola', 'hello', 'hi', 'hey', 'holi', 'holaa', 'holaaa', 'holaaaaa',
  'buenas', 'buenos', 'buen',
  'buenos dias', 'buenas dias', 'buen dia', 'buenas tardes', 'buenas noches',
  'buen dia', 'buena tarde', 'buena noche',
  // Abreviadas / informales
  'bd', 'bt', 'bn',                   // buenos días / buenas tardes / buenas noches
  'bdia', 'btardes', 'bnoches',
  // Peruanismos / jerga
  'cho', 'choo', 'oye', 'oe', 'oee',
  'causa', 'caus',                    // "causa" = amigo en Perú
  'brother', 'bro',
  'acá', 'aca',
  'pe', 'pue',                        // "pues" informal
  // Frases de saludo
  'que tal', 'q tal', 'k tal',
  'como estas', 'como estan', 'como esta',
  'como te va', 'como te esta yendo',
  'que hay', 'q hay', 'que hubo', 'q hubo', 'que fue',
  'que pasa', 'q pasa', 'que paso', 'q paso',
  'epale', 'epa', 'ey', 'eeeh', 'eeh',
  'que onda', 'q onda',
  'saludos', 'saludo',
  'good morning', 'good afternoon', 'good evening',
  // Intenciones claras de empezar
  'inicio', 'menu', 'start', 'empezar', 'comenzar',
  'reservar', 'quiero reservar', 'hacer reserva', 'hacer una reserva',
  'necesito reservar', 'necesito una cancha', 'quiero una cancha',
  'disponible', 'disponibles',
  'info', 'informacion', 'informes',
];

export function esSaludo(mensaje) {
  const norm = normalizar(mensaje);
  // Coincidencia exacta o que empiece/termine con la palabra
  return PALABRAS_SALUDO.some(s => {
    const sNorm = normalizar(s);
    return norm === sNorm
      || norm.startsWith(sNorm + ' ')
      || norm.endsWith(' ' + sNorm)
      || (sNorm.length > 4 && norm.includes(sNorm)); // coincidencia parcial para palabras >4 letras
  });
}

// ─── FECHAS EN TEXTO NATURAL ──────────────────────────────
// Acepta variedades extremas:
// hoy, oi, este dia
// mañana, manana, mñna, mñn, mn, deman, tmrw, dmn, mna, mañn
// pasado, pasado mañana, p mañana, pmn, pma, pman, pmana, 2 dias
// en la mañana de mañana (= mañana)
// en la tarde / en la noche (= hoy, con hora de tarde/noche)
// lunes, martes... (próximo día de la semana)

export function parsearFechaNatural(texto) {
  const norm = normalizar(texto);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // ── HOY ─────────────────────────────────────────────────
  if (/^(hoy|today|este dia|ste dia|ahora|ahorita|oi|oy|hooy)$/.test(norm)
    || /^(en la (man|tard|noch)|esta (man|tard|noch))/.test(norm)) {
    return hoy;
  }

  // ── MAÑANA ──────────────────────────────────────────────
  // Variaciones: mañana, manana, mñana, mñna, mñn, mána, mana, mn, deman, mna, tmrw, tomorrow
  if (/^(ma[n\u00f1][a\u00e1]?n?a?|m[n\u00f1][a\u00e1]?n?a?|mn|mna|deman|de ma[n\u00f1]|dmn|tomorrow|tmrw|al dia siguiente)$/.test(norm)) {
    const d = new Date(hoy); d.setDate(d.getDate() + 1); return d;
  }

  // ── PASADO MAÑANA ────────────────────────────────────────
  // Variaciones: pasado mañana, p mañana, pmn, pman, pma, pasaman, 2 dias, en 2 dias
  if (/^(pasado? ?(ma[n\u00f1]ana|ma[n\u00f1]an|mn|mna)|p(as)? ?(ma[n\u00f1]|mn|mna)|pmn|pman|pma[n\u00f1]?|pasaman|overmorrow|2 dias?|en 2 dias?)$/.test(norm)) {
    const d = new Date(hoy); d.setDate(d.getDate() + 2); return d;
  }

  // ── N DÍAS DESDE HOY ─────────────────────────────────────
  // "en 3 dias", "3 dias", "dentro de 4 dias"
  const enNDias = norm.match(/^(?:en |dentro de )?(\d+) dias?$/);
  if (enNDias) {
    const n = parseInt(enNDias[1]);
    if (n >= 0 && n <= 60) {
      const d = new Date(hoy); d.setDate(d.getDate() + n); return d;
    }
  }

  // ── PRÓXIMO DÍA DE LA SEMANA ────────────────────────────
  const DIAS_SEMANA = {
    domingo: 0, dom: 0,
    lunes: 1, lun: 1,
    martes: 2, mar: 2,
    miercoles: 3, mier: 3, mie: 3,
    jueves: 4, jue: 4,
    viernes: 5, vie: 5,
    sabado: 6, sab: 6
  };
  for (const [nombre, numDia] of Object.entries(DIAS_SEMANA)) {
    if (norm.includes(nombre)) {
      const d = new Date(hoy);
      const hoyDia = d.getDay();
      let diff = numDia - hoyDia;
      if (diff <= 0) diff += 7; // próxima semana si ya pasó
      d.setDate(d.getDate() + diff);
      return d;
    }
  }

  // ── FORMATO DD/MM/AAAA o DD-MM-AAAA ─────────────────────
  const fmtCompleto = texto.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (fmtCompleto) {
    const [, dia, mes, anio] = fmtCompleto;
    const d = new Date(`${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`);
    if (!isNaN(d)) return d;
  }

  // ── FORMATO DD/MM (año actual o siguiente) ───────────────
  const fmtCorto = texto.trim().match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (fmtCorto) {
    const [, dia, mes] = fmtCorto;
    const anio = new Date().getFullYear();
    let d = new Date(`${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`);
    if (!isNaN(d) && d >= hoy) return d;
    // Intentar año siguiente
    const dSig = new Date(`${anio + 1}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`);
    if (!isNaN(dSig)) return dSig;
  }

  // ── SOLO DÍA DEL MES ─────────────────────────────────────
  // "el 20", "dia 20", "20 de este mes"
  const soloDia = norm.match(/^(?:el |dia )?(\d{1,2})(?:\s+de este mes)?$/);
  if (soloDia) {
    const dia = parseInt(soloDia[1]);
    const ahora = new Date();
    const d = new Date(ahora.getFullYear(), ahora.getMonth(), dia);
    if (!isNaN(d) && d >= hoy) return d;
    // Mes siguiente
    const dSig = new Date(ahora.getFullYear(), ahora.getMonth() + 1, dia);
    if (!isNaN(dSig)) return dSig;
  }

  return null;
}

// ─── FORMATEO ─────────────────────────────────────────────
export function formatearFecha(fecha) {
  const d = String(fecha.getDate()).padStart(2, '0');
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const a = fecha.getFullYear();
  return `${d}/${m}/${a}`;
}

export function fechaKey(fecha) {
  const d = String(fecha.getDate()).padStart(2, '0');
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const a = fecha.getFullYear();
  return `${a}-${m}-${d}`;
}

const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const NOMBRES_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function nombreFecha(fecha) {
  return `${NOMBRES_DIA[fecha.getDay()]} ${fecha.getDate()} de ${NOMBRES_MES[fecha.getMonth()]}`;
}

// ─── VALIDAR DNI ──────────────────────────────────────────
export function esFormatoDNI(texto) {
  return /^\d{8}$/.test(texto.trim().replace(/\s+/g, ''));
}

// ─── EXTRAER HORA DE TEXTO LIBRE ────────────────────────
// "a las 8", "8am", "8 de la noche", "20:00", "las 3 de la tarde"
export function extraerHoraDeTexto(texto) {
  const t = texto.toLowerCase().trim();

  // "20:00", "8:00"
  const fmt1 = t.match(/^(\d{1,2}):00$/);
  if (fmt1) {
    const h = parseInt(fmt1[1]);
    if (h >= 7 && h <= 22) return `${String(h).padStart(2, '0')}:00`;
  }

  // "a las X de la mañana/tarde/noche", "las X pm"
  const fmt2 = t.match(/(?:a las?|las?)\s*(\d{1,2})(?::00)?\s*(am|pm|de la ma[nñ]ana|de la tarde|de la noche|de la madrugada)?/i);
  if (fmt2) {
    let h = parseInt(fmt2[1]);
    const p = (fmt2[2] || '').toLowerCase();
    if (p.includes('pm') || p.includes('tarde') || p.includes('noche')) {
      if (h < 12) h += 12;
    }
    if (p.includes('am') || p.includes('mañana') || p.includes('manana')) {
      if (h === 12) h = 0;
    }
    if (h >= 7 && h <= 22) return `${String(h).padStart(2, '0')}:00`;
  }

  // "8pm", "8am", solo número entre 7 y 22
  const fmt3 = t.match(/^(\d{1,2})\s*(am|pm)?$/);
  if (fmt3) {
    let h = parseInt(fmt3[1]);
    const p = (fmt3[2] || '').toLowerCase();
    if (p === 'pm' && h < 12) h += 12;
    if (p === 'am' && h === 12) h = 0;
    if (h >= 7 && h <= 22) return `${String(h).padStart(2, '0')}:00`;
  }

  return null;
}

// ─── CONFIRMACIONES SÍ/NO ─────────────────────────────────
const PALABRAS_SI = [
  'si', 's', 'sí', 'yes', 'ya', 'dale', 'ok', 'okay', 'okey', 'okai',
  'claro', 'claro que si', 'por supuesto', 'desde luego',
  'afirmativo', 'correcto', 'exacto', 'exactamente',
  'confirmar', 'confirmo', 'confirma', 'quiero', 'acepto',
  'va', 'va pe', 'vape', 'ya pe', 'listo', 'hecho', 'ya esta',
  'eso', 'de una', 'de un'                   // peruanismos: "de una" = sí
];

const PALABRAS_NO = [
  'no', 'n', 'nope', 'nel', 'nah', 'na', 'naa',
  'cancelar', 'cancela', 'cancelo', 'cancel',
  'salir', 'volver', 'atras', 'atraz',
  'para', 'para ya', 'olvidar', 'olvida'
];

export function esConfirmacionSi(texto) {
  const norm = normalizar(texto);
  return PALABRAS_SI.some(s => norm === normalizar(s));
}

export function esConfirmacionNo(texto) {
  const norm = normalizar(texto);
  return PALABRAS_NO.some(n => norm === normalizar(n));
}
