const fs = require('fs');
let c = fs.readFileSync('c:/chatbot-grass/lenguaje.js', 'utf8');

const fnStart = c.indexOf('function _limpiarParaFecha');
const fnEnd = c.indexOf('\nexport function parsearFechaYHora');
const afterFechaYHora = c.indexOf('\n}', fnEnd) + 2;

// Build the new functions with correct backslashes
const newFns = `function _limpiarParaFecha(norm) {
  return norm
    .replace(/^(quiero para|necesito para|reservar para|separar para|dame para|quiero|necesito|dame|quisiera|deseo|queria|pa el|para el dia|para el|para la|para)\\s+/, '')
    .replace(/^(en el|en la|el dia|el|la|este|esta|esto)\\s+/, '')
    .replace(/\\s+a las?\\s+\\d{1,2}.*$/, '')
    .replace(/\\s+\\d{1,2}\\s*(am|pm).*$/, '')
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
    if (/^(pasado\\s+mana(na)?|pasado\\s+mn|p\\s*man[a]?|pmn|pman|pma[n]?|pasaman|overmorrow|2\\s*dias?|en\\s*2\\s*dias?)$/.test(t)) {
      const d = new Date(hoy); d.setDate(d.getDate() + 2); return d;
    }

    // ── N DÍAS DESDE HOY ─────────────────────────────────────────────
    const enNDias = t.match(/^(?:en |dentro de )?(\\d+) dias?$/);
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
  const fmtCompleto = texto.match(/(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{4})/);
  if (fmtCompleto) {
    const [, dia, mes, anio] = fmtCompleto;
    const d = new Date(\`\${anio}-\${mes.padStart(2, '0')}-\${dia.padStart(2, '0')}\`);
    if (!isNaN(d)) return d;
  }

  // ── FORMATO DD/MM ────────────────────────────────────────────────────
  const fmtCorto = texto.match(/\\b(\\d{1,2})[\\/\\-](\\d{1,2})\\b(?![\\/\\d])/);
  if (fmtCorto) {
    const [, dia, mes] = fmtCorto;
    const anio = new Date().getFullYear();
    let d = new Date(\`\${anio}-\${mes.padStart(2, '0')}-\${dia.padStart(2, '0')}\`);
    if (!isNaN(d) && d >= hoy) return d;
    const dSig = new Date(\`\${anio + 1}-\${mes.padStart(2, '0')}-\${dia.padStart(2, '0')}\`);
    if (!isNaN(dSig)) return dSig;
  }

  // ── SOLO DÍA DEL MES ──────────────────────────────────────────────────
  const soloDia = clean.match(/^(?:el |dia )?(\\d{1,2})(?:\\s+de este mes)?$/);
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
`;

const newContent = c.slice(0, fnStart) + newFns + '\n' + c.slice(afterFechaYHora);
fs.writeFileSync('c:/chatbot-grass/lenguaje.js', newContent, 'utf8');
console.log('Done. Length:', newContent.length);
