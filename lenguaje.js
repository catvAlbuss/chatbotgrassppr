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
  'buenas', 'buenos', 'q', 'buen','qlq','q ceuntas','hay canchas?','hay','que onda', 'q onda', 'que hubo', 'q hubo', 'que hay', 'q hay',
  'buenos dias', 'buenas dias', 'buen dia', 'buenas tardes', 'buenas noches','disculpe',
  'buen dia', 'buena tarde', 'buena noche', 'buenastardes', 'buenasnoches',
  // Abreviadas / informales
  'bd', 'bt', 'bn',                   // buenos días / buenas tardes / buenas noches
  'bdia', 'btardes', 'bnoches', 'bdiass', 'btardess',
  // Peruanismos / jerga
  'cho', 'choo', 'oie', 'oye', 'oe', 'oee', 'oyee', 'oyee hermano',
  'causa', 'caus', 'causita',         // "causa" = amigo en Perú
  'brother', 'bro', 'hermano', 'compa', 'compadre',
  'acá', 'aca', 'aqui', 'aquí',
  'pe', 'pue', 'pues',                // "pues" informal
  'oe', 'eeo', 'eyo', 'eeyo',
  'che', 'ché', 'mira', 'miraa',
  // Frases de saludo
  'que tal', 'q tal', 'k tal', 'q onda', 'q onda hermano',
  'como estas', 'como estan', 'como esta', 'comoestas', 'comoestaas',
  'como te va', 'como te esta yendo', 'como te iba',
  'que hay', 'q hay', 'que hubo', 'q hubo', 'que fue', 'q fue',
  'que pasa', 'q pasa', 'que paso', 'q paso', 'quepasa', 'quepasoo',
  'epale', 'epa', 'ey', 'eeeh', 'eeh', 'eyyyye',
  'que onda', 'q onda', 'q ondita',
  'saludos', 'saludo', 'saludosss', 'un saludo',
  'good morning', 'good afternoon', 'good evening', 'goodmorning',
  // Intenciones claras de empezar
  'inicio', 'menu', 'start', 'empezar', 'comenzar', 'start aqui',
  'reservar', 'quiero reservar', 'hacer reserva', 'hacer una reserva',
  'necesito reservar', 'necesito una cancha', 'quiero una cancha',
  'disponible', 'disponibles', 'tienes cancha', 'hay cancha',
  'info', 'informacion', 'informes', 'informa', 'informar',
  'ayuda', 'ayudame', 'necesito ayuda', 'me ayudas',
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

function _limpiarParaFecha(norm) {
  return norm
    .replace(/^(quiero para|necesito para|reservar para|separar para|dame para|quiero|necesito|dame|quisiera|deseo|queria|pa el|para el dia|para el|para la|para)\s+/, '')
    .replace(/^(en el|en la|el dia|el|la|este|esta|esto)\s+/, '')
    .replace(/\s+a las?\s+\d{1,2}.*$/, '')
    .replace(/\s+\d{1,2}\s*(am|pm).*$/, '')
    .trim();
}

export function parsearFechaNatural(texto) {
  const norm = normalizar(texto);
  const clean = _limpiarParaFecha(norm);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  for (const t of [...new Set([clean, norm])]) {
    // ── HOY ────────────────────────────────────────────
    if (/^(hoy|today|este dia|ste dia|ahora|ahorita|oi|oy|hooy|hoy dia)$/.test(t)
      || /^(en la (man|tard|noch)|esta (man|tard|noch))/.test(t)) {
      return hoy;
    }

    // ── MAÑANA ──────────────────────────────────────────────────────
    if (/^(ma[n][a]?n?a?|m[n][a]?n?a?|mn|mna|deman|de man|dmn|tomorrow|tmrw|al dia siguiente)$/.test(t)) {
      const d = new Date(hoy); d.setDate(d.getDate() + 1); return d;
    }

    // ── PASADO MAÑANA ──────────────────────────────────────────────
    if (/^(pasado\s+mana(na)?|pasado\s+mn|p\s*man[a]?|pmn|pman|pma[n]?|pasaman|overmorrow|2\s*dias?|en\s*2\s*dias?)$/.test(t)) {
      const d = new Date(hoy); d.setDate(d.getDate() + 2); return d;
    }

    // ── N DÍAS DESDE HOY ─────────────────────────────────────────────
    const enNDias = t.match(/^(?:en |dentro de )?(\d+) dias?$/);
    if (enNDias) {
      const n = parseInt(enNDias[1]);
      if (n >= 0 && n <= 60) {
        const d = new Date(hoy); d.setDate(d.getDate() + n); return d;
      }
    }

    // ── PRÓXIMO DÍA DE LA SEMANA ──────────────────────────────────────────
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
      if (t.includes(nombre)) {
        const d = new Date(hoy);
        const hoyDia = d.getDay();
        let diff = numDia - hoyDia;
        if (diff <= 0) diff += 7;
        d.setDate(d.getDate() + diff);
        return d;
      }
    }
  }

  // ── FORMATO DD/MM/AAAA (busca en el texto completo) ──────
  const fmtCompleto = texto.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (fmtCompleto) {
    const [, dia, mes, anio] = fmtCompleto;
    const d = new Date(`${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`);
    if (!isNaN(d)) return d;
  }

  // ── FORMATO DD/MM ────────────────────────────────────────────────────
  const fmtCorto = texto.match(/\b(\d{1,2})[\/\-](\d{1,2})\b(?![\/\d])/);
  if (fmtCorto) {
    const [, dia, mes] = fmtCorto;
    const anio = new Date().getFullYear();
    let d = new Date(`${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`);
    if (!isNaN(d) && d >= hoy) return d;
    const dSig = new Date(`${anio + 1}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`);
    if (!isNaN(dSig)) return dSig;
  }

  // ── SOLO DÍA DEL MES ──────────────────────────────────────────────────
  const soloDia = clean.match(/^(?:el |dia )?(\d{1,2})(?:\s+de este mes)?$/);
  if (soloDia) {
    const dia = parseInt(soloDia[1]);
    const ahora = new Date();
    const d = new Date(ahora.getFullYear(), ahora.getMonth(), dia);
    if (!isNaN(d) && d >= hoy) return d;
    const dSig = new Date(ahora.getFullYear(), ahora.getMonth() + 1, dia);
    if (!isNaN(dSig)) return dSig;
  }

  return null;
}

export function parsearFechaYHora(texto) {
  return {
    fecha: parsearFechaNatural(texto) ?? null,
    hora:  extraerHoraDeTexto(texto)  ?? null
  };
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
  'si', 's', 'sí', 'yes', 'ya', 'dale', 'ok', 'okay', 'okey', 'okai', 'kk',
  'claro', 'claro que si', 'claro que sí', 'por supuesto', 'desde luego', 'obvio',
  'afirmativo', 'correcto', 'exacto', 'exactamente', 'exaacto',
  'confirmar', 'confirmo', 'confirma', 'quiero', 'acepto', 'acepta', 'aceptar',
  'va', 'va pe', 'vape', 'ya pe', 'listo', 'hecho', 'ya esta', 'ya está', 'está bien',
  'eso', 'de una', 'de un', 'vamo', 'vamos', 'anda', 'andas',
  'perfecto', 'bueno', 'sale', 'dale pues', 'ta bien', 'okey dokey',
  'siiiii', 'siiii', 'syy', 'tal cual', 'totalmente', 'def', 'defintv',
  'en orden', 'estamos bien', 'esta ok', 'ta ok', 'ok ok ok'
];

const PALABRAS_NO = [
  'no', 'n', 'nope', 'nel', 'nah', 'na', 'naa', 'non', 'noo', 'noooo',
  'cancelar', 'cancela', 'cancelo', 'cancel', 'cancele', 'cancelemos',
  'salir', 'volver', 'atras', 'atraz', 'atrás', 'pa atras', 'pal atras',
  'para', 'para ya', 'olvidar', 'olvida', 'olvidalo', 'olvídalo',
  'no gracias', 'nogaras', 'nomas', 'no mas', 'nunca', 'jamas', 'jamás',
  'depois', 'después', 'mañana', 'en otro momento', 'otro dia', 'otro momento',
  'no es', 'no quiero', 'no necesito', 'no puedo', 'no tengo', 'no hay',
  'falso', 'falso negativo', 'para nada', 'ni modo', 'ni hablar'
];

export function esConfirmacionSi(texto) {
  const norm = normalizar(texto);
  return PALABRAS_SI.some(s => norm === normalizar(s));
}

export function esConfirmacionNo(texto) {
  const norm = normalizar(texto);
  return PALABRAS_NO.some(n => norm === normalizar(n));
}

// ─── PALABRAS PARA RESERVAS ──────────────────────────────
const PALABRAS_RESERVA = [
  'reserva', 'reservar', 'reservacion', 'reservación', 'reservame', 'resérvame',
  'quiero', 'necesito', 'dame', 'dame una', 'dame una cancha', 'dame cancha',
  'booking', 'book', 'agendar', 'agenda', 'agende', 'agendarme',
  'separar', 'separa', 'separame', 'separeme', 'aparta', 'apartame',
  'apartar', 'apartar cancha', 'apartar pista', 'apartar una hora',
  'pedir', 'pideme', 'pídeme', 'solicitar', 'solicita',
  'ocupar', 'ocupame', 'ocupo', 'ocupar cancha', 'ocupar pista',
  'usa', 'usar', 'usaremos', 'usare', 'usaré',
  'alquilar', 'alquila', 'alquilame', 'alquílame', 'rental', 'rent'
];

// ─── PALABRAS PARA CANCHAS/GRASS ─────────────────────────
const PALABRAS_CANCHA = [
  'cancha', 'canchas', 'pista', 'pistas', 'cancha de grass', 'pista de grass',
  'grass', 'grass sintetico', 'grass sintético', 'cesped', 'césped', 'pasto',
  'campo', 'campos', 'cancha de futbol', 'cancha de futsal', 'cancha de futsal',
  'losa', 'losas', 'cancha techada', 'cancha cubierta', 'cancha abierta',
  'sintético', 'sintetico', 'artificial', 'profesional', 'profesional sintético',
  'para jugar', 'para entrenar', 'para competir', 'para futsal', 'para futbol',
  '5v5', '6v6', '7v7', '8v8', 'cinco contra cinco', 'seis contra seis'
];

// ─── PALABRAS PARA UBICACIÓN/BÚSQUEDA ─────────────────────
const PALABRAS_UBICACION = [
  'donde', 'dónde', 'ubicacion', 'ubicación', 'localización', 'donde quedan',
  'donde estan', 'dónde están', 'direccion', 'dirección', 'ubicada',
  'cerca', 'cercana', 'cerca de', 'cercano', 'cercano a',
  'distancia', 'lejos', 'muy lejos', 'a cuanta distancia',
  'buscar', 'busca', 'buscame', 'búscame', 'buscar una', 'buscar cancha',
  'encontrar', 'encuentra', 'encontrameuna', 'encuéntrame',
  'cual hay', 'cuál hay', 'que hay', 'qué hay', 'listar', 'lista',
  'cuales hay', 'cuáles hay', 'opciones', 'alternativas', 'opciones disponibles',
  'mostrar', 'muestra', 'mostrameuna', 'muéstrame', 'enseña',
  'mapa', 'mapas', 'ubicar en mapa', 'zona', 'zonas'
];

// ─── PALABRAS PARA HORARIOS/HORAS ────────────────────────
const PALABRAS_HORA = [
  'hora', 'horas', 'horario', 'horarios', 'a que hora', 'a qué hora',
  'a las', 'de la', 'de las', 'por la', 'por las',
  'mañana', 'manana', 'tarde', 'noche', 'madrugada',
  'temprano', 'tarde', 'noche', 'mediodia', 'mediodía',
  'disponible', 'disponibles', 'vacante', 'vacantes', 'libre', 'libres',
  'ocupado', 'ocupada', 'ocupados', 'ocupadas', 'reservado',
  'abierto', 'cerrado', 'habilitado', 'deshabilitado',
  'cuantas horas', 'cuántas horas', 'cuantos minutos', 'cuántos minutos',
  'duracion', 'duración', 'tiempo', 'cuanto tiempo', 'cuánto tiempo',
  'una hora', 'dos horas', 'media hora', '30 minutos', '60 minutos', 'hora y media'
];

// ─── PALABRAS PARA PRECIO/PAGO ──────────────────────────
const PALABRAS_PRECIO = [
  'precio', 'precios', 'costo', 'costos', 'tarifa', 'tarifas', 'cuanto cuesta',
  'cuánto cuesta', 'cuesta', 'cuesta', 'cuanto vale', 'cuánto vale', 'vale',
  'soles', 'soles peruanos', 'pesos', 'dolares', 'dólares',
  'pagar', 'pagame', 'págame', 'pago', 'pagos', 'factura',
  'adelanto', 'deposito', 'depósito', 'transferencia', 'transferir',
  'metodo pago', 'método pago', 'como pago', 'cómo pago',
  'efectivo', 'tarjeta', 'tarjeta credito', 'tarjeta de crédito',
  'yape', 'plin', 'billetera', 'billetera digital', 'transferencia bancaria',
  'descuento', 'descuentos', 'oferta', 'ofertas', 'promocion', 'promoción',
  'gratis', 'promocional', 'rebaja', 'rebajas', 'oferton'
];

// ─── PALABRAS PARA CONFIRMACIÓN DE DATOS ────────────────
const PALABRAS_DATOS = [
  'nombre', 'nombres', 'nombre completo', 'como te llamas',
  'cómo te llamas', 'cual es tu nombre', 'cuál es tu nombre',
  'telefono', 'teléfono', 'celular', 'numero', 'número', 'telefono celular',
  'dni', 'documento', 'documento de identidad', 'cedula', 'cédula',
  'correo', 'email', 'correo electronico', 'correo electrónico',
  'verificar', 'confirmar', 'data', 'datos', 'informacion personal', 'información personal',
  'correcto', 'correcto así es', 'si asi es', 'sí así es', 'es correcto'
];

// ─── PALABRAS PARA AYUDA/SOPORTE ────────────────────────
const PALABRAS_AYUDA = [
  'ayuda', 'ayudame', 'ayúdame', 'me ayudas', 'necesito ayuda',
  'no entiendo', 'no entendi', 'que no entiendo', 'como', 'cómo',
  'problema', 'problemas', 'error', 'errores', 'no funciona', 'no me funciona',
  'no funciono', 'falla', 'fallo', 'algo falla', 'algo no funciona',
  'soporte', 'soporta', 'comunicar', 'contactar', 'contacto',
  'quejas', 'queja', 'reclamo', 'reclamos', 'reclamacion', 'reclamación',
  'volver', 'volver al menu', 'vuelve', 'atras', 'atrás', 'para atras',
  'opcion', 'opción', 'cual es la opcion', 'cuál es la opción',
  'ejemplo', 'ejemplos', 'me puedes', 'me puedes dar un ejemplo',
  'como se hace', 'cómo se hace', 'paso a paso', 'pasos'
];

// ─── PALABRA PARA VERIFICAR SI ES BÚSQUEDA DE RESERVA ─────
export function esReserva(mensaje) {
  const norm = normalizar(mensaje);
  return PALABRAS_RESERVA.some(s => {
    const sNorm = normalizar(s);
    return norm.includes(sNorm);
  });
}

// ─── PALABRA PARA VERIFICAR SI BUSCA CANCHA ────────────────
export function esBuscaCancha(mensaje) {
  const norm = normalizar(mensaje);
  return PALABRAS_CANCHA.some(s => {
    const sNorm = normalizar(s);
    return norm.includes(sNorm);
  });
}

// ─── PALABRA PARA VERIFICAR SI BUSCA UBICACIÓN ─────────────
export function esBuscaUbicacion(mensaje) {
  const norm = normalizar(mensaje);
  return PALABRAS_UBICACION.some(s => {
    const sNorm = normalizar(s);
    return norm.includes(sNorm);
  });
}

// ─── PALABRA PARA VERIFICAR SI PREGUNTA POR HORARIO ────────
export function esPreguntaHorario(mensaje) {
  const norm = normalizar(mensaje);
  return PALABRAS_HORA.some(s => {
    const sNorm = normalizar(s);
    return norm.includes(sNorm);
  });
}

// ─── PALABRA PARA VERIFICAR SI PREGUNTA POR PRECIO ─────────
export function esPreguntaPrecio(mensaje) {
  const norm = normalizar(mensaje);
  return PALABRAS_PRECIO.some(s => {
    const sNorm = normalizar(s);
    return norm.includes(sNorm);
  });
}
