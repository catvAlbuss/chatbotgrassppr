// ============================================================
// lenguaje.js - Procesamiento de lenguaje natural amplio
// Detecta intenciones sin importar abreviaciones, tildes,
// mayúsculas o errores ortográficos comunes
// ============================================================

/**
 * Normaliza un texto: minúsculas, sin tildes, sin puntuación extra
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
// Variaciones: hola, hola!, ola, ola!, k tal, q tal, buenas,
// buenos dias, buen dia, buenas tardes, etc.
const PALABRAS_SALUDO = [
  'hola', 'ola', 'hello', 'hi', 'hey', 'holi', 'holaa', 'holaaaaa',
  'buenas', 'buenos', 'buen', 'buenas noches', 'buenas tardes',
  'buenos dias', 'buenas dias', 'buen dia',
  'que tal', 'q tal', 'k tal', 'como estas', 'como estan',
  'saludos', 'saludo', 'que hay', 'q hay', 'que hubo', 'q hubo',
  'epa', 'ey', 'epale', 'que pasa', 'q pasa',
  'inicio', 'menu', 'start', 'empezar', 'comenzar',
  'reservar', 'quiero reservar', 'hacer una reserva',
  'necesito reservar', 'reserva'
];

export function esSaludo(mensaje) {
  const norm = normalizar(mensaje);
  return PALABRAS_SALUDO.some(s => {
    const sNorm = normalizar(s);
    return norm === sNorm || norm.startsWith(sNorm + ' ') || norm.endsWith(' ' + sNorm);
  });
}

// ─── FECHAS EN TEXTO NATURAL ──────────────────────────────
// Acepta: hoy, mañana, manana, mñn, mn, pmañana, pasado,
// pasado manana, p mañana, etc.
export function parsearFechaNatural(texto) {
  const norm = normalizar(texto);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // HOY
  if (/^(hoy|today|ahora|este dia|ste dia)$/.test(norm)) {
    return hoy;
  }

  // MAÑANA – variaciones: mañana, manana, mañan, manán, manan, mñna, mñn, mn, dmañana
  if (/^(ma[ñn]ana|ma[ñn]an|m[ñn]n?a?|mn|tomorrow|deman|de ma|dema|mañan|manan)$/.test(norm)) {
    const d = new Date(hoy);
    d.setDate(d.getDate() + 1);
    return d;
  }

  // PASADO MAÑANA – variaciones: pasado, p mañana, p manana, pmañana, pasado manana,
  // pasado mañana, pas mañana, pma, pmn, p mn, 2 dias, en 2 dias
  if (/^(pasado? ?(ma[ñn]ana|ma[ñn]an|mn)|p ?(ma[ñn]ana?|mn)|pmn|pman|pma[ñn]|overmorrow|en 2 dias?|2 dias?)$/.test(norm)) {
    const d = new Date(hoy);
    d.setDate(d.getDate() + 2);
    return d;
  }

  // Dentro de N días: "en 3 dias", "3 dias"
  const enNDias = norm.match(/^(?:en )?(\d+) dias?$/);
  if (enNDias) {
    const n = parseInt(enNDias[1]);
    if (n >= 0 && n <= 30) {
      const d = new Date(hoy);
      d.setDate(d.getDate() + n);
      return d;
    }
  }

  // Formato DD/MM/AAAA o DD-MM-AAAA o DDMMAAAA
  const fmtSlash = texto.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (fmtSlash) {
    const [, dia, mes, anio] = fmtSlash;
    const d = new Date(`${anio}-${mes.padStart(2,'0')}-${dia.padStart(2,'0')}`);
    if (!isNaN(d)) return d;
  }

  // Formato DD/MM (año actual o siguiente)
  const fmtCorto = texto.trim().match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (fmtCorto) {
    const [, dia, mes] = fmtCorto;
    const anio = new Date().getFullYear();
    const d = new Date(`${anio}-${mes.padStart(2,'0')}-${dia.padStart(2,'0')}`);
    if (!isNaN(d) && d >= hoy) return d;
    // Intentar año siguiente
    const dSig = new Date(`${anio + 1}-${mes.padStart(2,'0')}-${dia.padStart(2,'0')}`);
    if (!isNaN(dSig)) return dSig;
  }

  return null;
}

/**
 * Formatea una fecha como DD/MM/AAAA
 */
export function formatearFecha(fecha) {
  const d = String(fecha.getDate()).padStart(2, '0');
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const a = fecha.getFullYear();
  return `${d}/${m}/${a}`;
}

/**
 * Formatea una fecha como AAAA-MM-DD (clave interna)
 */
export function fechaKey(fecha) {
  const d = String(fecha.getDate()).padStart(2, '0');
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const a = fecha.getFullYear();
  return `${a}-${m}-${d}`;
}

// ─── NOMBRE DEL DÍA ──────────────────────────────────────
const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

export function nombreFecha(fecha) {
  return `${DIAS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

// ─── CONFIRMACIONES SÍ/NO ─────────────────────────────────
const SI = ['si', 's', 'sí', 'yes', 'ya', 'dale', 'ok', 'okay', 'claro', 'por supuesto',
            'afirmativo', 'correcto', 'exacto', 'confirmar', 'confirma', 'quiero', 'acepto'];
const NO = ['no', 'n', 'nope', 'nel', 'nah', 'cancelar', 'cancela', 'salir', 'cancel'];

export function esConfirmacionSi(texto) {
  const norm = normalizar(texto);
  return SI.some(s => norm === normalizar(s));
}

export function esConfirmacionNo(texto) {
  const norm = normalizar(texto);
  return NO.some(n => norm === normalizar(n));
}

// ─── VALIDAR DNI ──────────────────────────────────────────
export function esFormatoDNI(texto) {
  return /^\d{8}$/.test(texto.trim());
}

// ─── EXTRAER POSIBLES HORAS DE TEXTO LIBRE ───────────────
// Para fallback si el usuario escribe: "a las 8", "8am", "20:00", "8 de la noche"
export function extraerHoraDeTexto(texto) {
  const norm = texto.toLowerCase().trim();

  // "a las 8", "a las 15"
  const match1 = norm.match(/(?:a las?|las?)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|de la ma[ñn]ana|de la tarde|de la noche)?/);
  if (match1) {
    let hora = parseInt(match1[1]);
    const min = match1[2] ? parseInt(match1[2]) : 0;
    const periodo = match1[3] || '';
    if (periodo.includes('pm') || periodo.includes('tarde') || periodo.includes('noche')) {
      if (hora < 12) hora += 12;
    }
    if (hora >= 7 && hora <= 22) {
      return `${String(hora).padStart(2,'0')}:00`;
    }
  }

  // "8pm", "8am", "20:00", "8:00"
  const match2 = norm.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (match2) {
    let hora = parseInt(match2[1]);
    const periodo = match2[3] || '';
    if (periodo === 'pm' && hora < 12) hora += 12;
    if (hora >= 7 && hora <= 22) {
      return `${String(hora).padStart(2,'0')}:00`;
    }
  }

  return null;
}
