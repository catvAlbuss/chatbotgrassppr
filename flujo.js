// ============================================================
// flujo.js - Máquina de estados para el chatbot (v2.2 multi-tenant)
// Recibe ctx = { botId, config, token, phoneNumberId }
// ============================================================
import {
  enviarTexto, enviarUbicacion, enviarUbicacionLugar,
  enviarBotones, enviarLista, enviarImagen, agregarAColaMensajes
} from './whatsapp.js';
import { buscarCanchas } from './search.js';
import { preguntarIA } from './openai.js';
import { getMensajePago, getUrlQRYape } from './qr.js';
import {
  getEstado, setEstado, resetEstado,
  getSlotsDisponibles, isSlotOcupado, intentarReservarSlot, marcarSlotOcupado,
  crearReserva, getReserva, actualizarReserva,
  pagosPendientes, registrarPagoPendiente, eliminarPagoPendiente,
  agregarHistorial
} from './storage.js';
import { buscarDNI, guardarPersonaManual } from './reniec.js';
import {
  esSaludo, parsearFechaNatural, parsearFechaYHora, formatearFecha, fechaKey,
  nombreFecha, esFormatoDNI, extraerHoraDeTexto, normalizar
} from './lenguaje.js';

// ─── HELPERS DE CONTEXTO ─────────────────────────────────
// Lee valores de la config del bot con fallback a los defaults originales
function cfg(ctx, key, fallback) {
  return ctx?.config?.[key] ?? fallback;
}

// ─── MENÚ PRINCIPAL ──────────────────────────────────────

async function inicioPri(phone, ctx, nombre = null) {
  const saludo = nombre ? `¡Hola, *${nombre}*! 👋` : '¡Hola! 👋';
  await enviarBotones(
    phone,
    '🔥🔥 *QUE SERVICIO DESEAS?* 🔥🔥',
    `\n\n *AQUI TIENES 2 OPCIONES EN BASE A LO QUE NECESITAS*
    \nELIJA:`,
    [
      { id: 'MEN_RES',    title: '📅 RESERVAR 📅' },
      { id: 'ubicaciones', title: '📍 BUSCAR GRASSES 📍' }
    ],
    ctx
  );
}

async function mostrarMenuPrincipal(phone, ctx, nombre = null) {
  const saludo = nombre ? `¡Hola, *${nombre}*! 👋` : '¡Hola! 👋';
  const botNombre = cfg(ctx, 'bot_nombre', 'Reserva de Grass Sintético');
  await enviarBotones(
    phone,
    `⚽ ${botNombre}`,
    `${saludo} Bienvenido al menu de reserva. 🌿\n\n¿Qué deseas hacer hoy?`,
    [
      { id: 'RESERVAR',       title: '📅 Reservar cancha' },
      { id: 'VER_DISPONIBLE', title: '🗓️ Ver disponibilidad' },
      { id: 'CONSULTAR',      title: '❓ Consultar info' }
    ],
    ctx
  );
}

// ─── MENÚ TIPO DE CANCHA ─────────────────────────────────
async function mostrarProductos(phone, ctx) {
  const precio       = cfg(ctx, 'precio_hora', 50);
  const descuento    = cfg(ctx, 'descuento_pago', 0.5);
  const canchas      = cfg(ctx, 'canchas', ['⚽ Fútbol', '🏐 Vóley', '🎉 Evento']);

  const msg =
    `🏟️ *NUESTRAS CANCHAS*\n\n` +
    canchas.map(c => `${c}\n`).join('\n') +
    `\n💰 *S/. ${precio}/hora*  🎁 Solo S/. ${precio * descuento} de adelanto (${descuento * 100}%)\n\n` +
    `¿Cuál cancha deseas reservar?`;

  // Tomar hasta 3 canchas para los botones
  const botonesCanchas = canchas.slice(0, 3).map((c, i) => ({
    id:    `TIPO_${i}`,
    title: c.length > 20 ? c.substring(0, 20) : c
  }));

  await enviarBotones(phone, '🏟️ Nuestras Canchas', msg, botonesCanchas, ctx);
}

// ─── CANCHAS CERCANAS ────────────────────────────────────
export async function mostrarUbiCercanas(phone, ctx) {
  const botId = ctx?.botId || 'default';
  const conv  = await getEstado(phone, botId);

  let lat = conv.datos?.lat;
  let lng = conv.datos?.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) { lat = -9.93; lng = -76.24; }

  try {
    const resultados = await buscarCanchas(lat, lng);
    if (resultados.length === 0) {
      agregarAColaMensajes(phone, () => enviarTexto(phone,
        `❌ No encontré canchas cercanas.\n\n⏳ Intenta en unos minutos o escribe *MENU*.`, ctx
      ));
      return;
    }
    agregarAColaMensajes(phone, () => enviarTexto(phone, "⚽ *Canchas Cercanas:*", ctx));
    for (let i = 0; i < Math.min(10, resultados.length); i++) {
      const lugar    = resultados[i];
      const nombre   = lugar.nombre || `Cancha ${i + 1}`;
      const distancia = lugar.distancia ? `📍 ${lugar.distancia}m` : '';
      agregarAColaMensajes(phone, () => enviarTexto(phone, `${i + 1}. *${nombre}* ${distancia}`, ctx));
      agregarAColaMensajes(phone, () => enviarUbicacionLugar(phone, lugar.lat, lugar.lng, nombre, ctx));
    }
  } catch (error) {
    console.error("Error al buscar canchas:", error);
    agregarAColaMensajes(phone, () => enviarTexto(phone,
      `⚠️ Problema al buscar canchas.\n\n🔄 Intenta de nuevo o escribe *MENU*.`, ctx
    ));
  }
}

// ─── HORARIOS ────────────────────────────────────────────
async function mostrarHorasDisponibles(phone, fecha, horasYaElegidas = [], pagina = 'manana', ctx) {
  const TODOS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00',
                 '14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];
  const botId      = ctx?.botId || 'default';
  const disponibles = await getSlotsDisponibles(fecha, botId);
  const manana      = TODOS.filter(h => parseInt(h) < 14);
  const tarde       = TODOS.filter(h => parseInt(h) >= 14);

  if (pagina === 'manana') {
    await setEstado(phone, 'ESPERANDO_HORA', { paginaHoras: 'manana' }, botId);
    await _enviarListaHoras(phone, manana, disponibles, horasYaElegidas, 'Manana 07:00-13:00', tarde.length > 0 ? 'tarde' : null, ctx);
  } else {
    await setEstado(phone, 'ESPERANDO_HORA', { paginaHoras: 'tarde' }, botId);
    await _enviarListaHoras(phone, tarde, disponibles, horasYaElegidas, 'Tarde/Noche 14:00-22:00', manana.length > 0 ? 'manana' : null, ctx);
  }
}

async function _enviarListaHoras(phone, turno, disponibles, horasElegidas, tituloSeccion, paginaNav, ctx) {
  const precio = cfg(ctx, 'precio_hora', 50);
  const items  = turno.map(h => {
    const estaEnCarrito  = horasElegidas.includes(h);
    const estaOcupado    = !disponibles.includes(h) && !estaEnCarrito;
    let emoji, desc;
    if (estaEnCarrito)    { emoji = '🛒'; desc = 'Ya en tu reserva'; }
    else if (estaOcupado) { emoji = '🔴'; desc = 'Ocupado'; }
    else                  { emoji = '✅'; desc = `S/. ${precio} · libre`; }
    return { id: `HORA_${h.replace(':', '')}`, title: `${emoji} ${h}`, description: desc };
  });

  const MAX_HORAS  = paginaNav ? 9 : 10;
  const rowsFinales = items.slice(0, MAX_HORAS);
  if (paginaNav) {
    rowsFinales.push({
      id:          `PAGINA_${paginaNav.toUpperCase()}`,
      title:       paginaNav === 'tarde' ? '>> Ver tarde/noche' : '<< Ver manana',
      description: 'Ver otros horarios'
    });
  }

  const resumen = horasElegidas.length > 0
    ? `\n\n🛒 *Elegidas:* ${horasElegidas.join(', ')} · S/. ${horasElegidas.length * precio}`
    : '';

  await enviarLista(
    phone, 'Elige tu hora',
    `📅 *Horarios disponibles*${resumen}\n\n✅ Libre · 🔴 Ocupado · 🛒 En tu reserva\n\nElige del menú 👇`,
    'Ver horarios',
    [{ title: tituloSeccion, rows: rowsFinales }],
    ctx
  );
}

// ─── SELECCIÓN INTERACTIVA DE FECHA ────────────────────────
async function mostrarBotonesFecha(phone, ctx, consulta = false) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const DIAS_ABR  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const MESES_ABR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    const etiqueta = i === 0 ? '📅 Hoy'
                   : i === 1 ? '📅 Mañana'
                   : i === 2 ? '📅 Pasado mañana'
                   : `📅 ${DIAS_ABR[d.getDay()]} ${d.getDate()} ${MESES_ABR[d.getMonth()]}`;
    rows.push({ id: `FECHA_DIA_${i}`, title: etiqueta, description: formatearFecha(d) });
  }
  const pregunta = consulta
    ? '🗓️ *¿Para qué fecha quieres ver disponibilidad?*'
    : '📅 *¿Para qué fecha quieres reservar?*';
  await enviarLista(
    phone,
    consulta ? '🗓️ Ver disponibilidad' : '📅 Elige la fecha',
    `${pregunta}

Elige del menú 👇

_O escribe: hoy, mañana, DD/MM/AAAA_`,
    'Ver fechas',
    [{ title: '📆 Próximas fechas', rows }],
    ctx
  );
}

// ─── PROCESAR MENSAJE PRINCIPAL ──────────────────────────
export async function procesarMensaje(phone, mensaje, tipo = 'text', ctx = {}) {
  const botId = ctx.botId || 'default';
  const conv  = await getEstado(phone, botId);
  const estado = conv.estado;

  console.log(`📱 [${botId}] ${phone} [${estado}]: ${mensaje}`);

  if (tipo === 'interactive') {
    await procesarBoton(phone, mensaje, conv, ctx);
    return;
  }

  const norm = normalizar(mensaje);
  const ESTADOS_CRITICOS = ['ESPERANDO_COMPROBANTE', 'PAGO_EN_REVISION', 'CONFIRMANDO_RESERVA'];
  const enEstadoCritico  = ESTADOS_CRITICOS.includes(estado);

  if (['menu', 'inicio', 'volver', 'atras', 'salir', 'start'].includes(norm)) {
    await resetEstado(phone, botId);
    await inicioPri(phone, ctx);
    return;
  }

  if (!enEstadoCritico && (norm.includes('grass') || norm.includes('cancha'))) {
    await mostrarUbiCercanas(phone, ctx);
    return;
  }

  if (estado === 'INICIO' || (esSaludo(mensaje) && !enEstadoCritico)) {
    await setEstado(phone, 'MENU_PRINCIPAL', {}, botId);
    const bienvenida = cfg(ctx, 'mensajes.bienvenida', '🌿 *¡Bienvenido!*, Soy un bot que te ayudará en:\n\n✅ *Reservar*\n✅ *Buscar canchas*');
    await enviarTexto(phone, bienvenida, ctx);
    await inicioPri(phone, ctx);
    return;
  }

  switch (estado) {

    case 'ESPERANDO_DNI': {
      const dniLimpio = mensaje.trim().replace(/\s+/g, '');
      if (!esFormatoDNI(dniLimpio)) {
        await enviarTexto(phone,
          `❌ Ese DNI no parece válido 😅\n\nIngresa exactamente *8 dígitos*.\nEjemplo: *12345678*`, ctx
        );
        return;
      }
      await setEstado(phone, 'ESPERANDO_NOMBRE', { dni: dniLimpio }, botId);
      await enviarTexto(phone,
        `✅ DNI *${dniLimpio}* registrado.\n\n👤 ¿Cuál es tu *nombre*? (solo nombres)\nEjemplo: _Juan Carlos_`, ctx
      );
      break;
    }

    case 'ESPERANDO_NOMBRE': {
      const nombre = mensaje.trim();
      if (nombre.length < 2) {
        await enviarTexto(phone, `❌ Nombre muy corto. Escribe tu *nombre completo*:`, ctx);
        return;
      }
      await setEstado(phone, 'ESPERANDO_APELLIDO', { nombres: nombre }, botId);
      await enviarTexto(phone,
        `✅ Nombre: *${nombre}*\n\n👤 Ahora tus *apellidos*:\nEjemplo: _Pérez Ríos_`, ctx
      );
      break;
    }

    case 'ESPERANDO_APELLIDO': {
      const apellido = mensaje.trim();
      if (apellido.length < 2) {
        await enviarTexto(phone, `❌ Apellido muy corto. Ingrésalo completo:`, ctx);
        return;
      }
      await setEstado(phone, 'ESPERANDO_FECHA', { apellidos: apellido }, botId);
      await guardarPersonaManual(conv.datos.dni, conv.datos.nombres, apellido);
      await enviarTexto(phone, `✅ Perfecto, *${conv.datos.nombres} ${apellido}*. 👋`, ctx);
      await mostrarBotonesFecha(phone, ctx);
      break;
    }

    case 'ESPERANDO_FECHA': {
      const { fecha: fechaObj } = parsearFechaYHora(mensaje);
      const hoyInicio = new Date(); hoyInicio.setHours(0, 0, 0, 0);
      if (!fechaObj || isNaN(fechaObj)) {
        await enviarTexto(phone, `😅 No encontré la fecha. Elige del menú 👇`, ctx);
        await mostrarBotonesFecha(phone, ctx);
        return;
      }
      if (fechaObj < hoyInicio) {
        await enviarTexto(phone, `❌ Esa fecha ya pasó. Elige una *de hoy en adelante* 👇`, ctx);
        await mostrarBotonesFecha(phone, ctx);
        return;
      }
      const fKey = fechaKey(fechaObj);
      await setEstado(phone, 'ESPERANDO_HORA', {
        fecha: fKey,
        fechaDisplay: formatearFecha(fechaObj),
        fechaNombre:  nombreFecha(fechaObj),
        horasElegidas: []
      }, botId);
      await enviarTexto(phone, `📅 *${nombreFecha(fechaObj)} (${formatearFecha(fechaObj)})* — ¡Perfecto! 🗓️\n\nElige tu(s) hora(s) 👇`, ctx);
      await mostrarHorasDisponibles(phone, fKey, [], 'manana', ctx);
      break;
    }

    case 'ESPERANDO_HORA': {
      const horaExtraida = extraerHoraDeTexto(mensaje);
      const pagActual    = conv.datos.paginaHoras || 'manana';
      if (horaExtraida) {
        const ocupado = await isSlotOcupado(conv.datos.fecha, horaExtraida, botId);
        if (ocupado) {
          await enviarTexto(phone, `❌ Las *${horaExtraida}* ya están ocupadas 😔\nElige otro horario:`, ctx);
          await mostrarHorasDisponibles(phone, conv.datos.fecha, conv.datos.horasElegidas || [], pagActual, ctx);
          return;
        }
        await agregarHoraYPreguntar(phone, horaExtraida, conv, ctx);
      } else {
        await enviarTexto(phone, `😅 No entendí eso. Por favor usa el menú de horarios 👇`, ctx);
        await mostrarHorasDisponibles(phone, conv.datos.fecha, conv.datos.horasElegidas || [], pagActual, ctx);
      }
      break;
    }

    case 'ESPERANDO_COMPROBANTE': {
      const reservaId = conv.datos.reservaId;
      await actualizarReserva(reservaId, { numeroOperacion: mensaje.trim(), estado: 'COMPROBANTE_ENVIADO' });
      await setEstado(phone, 'PAGO_EN_REVISION', {}, botId);
      await enviarTexto(phone,
        `✅ *Número de operación recibido:* ${mensaje.trim()}\n\n📸 Ahora envíanos la *captura del comprobante*. 👇`, ctx
      );
      break;
    }

    case 'PAGO_EN_REVISION':
      await enviarTexto(phone,
        `⏳ Tu pago está siendo *revisado*.\n\nTe avisaremos pronto. 🙏\n\n_Escribe *MENU* si necesitas ayuda._`, ctx
      );
      break;

    case 'CONSULTANDO': {
      const historial  = conv.historial || [];
      const respuesta  = await preguntarIA(historial, mensaje, ctx.config || {});
      await agregarHistorial(phone, 'user',      mensaje,   botId);
      await agregarHistorial(phone, 'assistant', respuesta, botId);
      await enviarTexto(phone, respuesta, ctx);
      await enviarTexto(phone, '\n_Escribe *MENU* para ver opciones._', ctx);
      break;
    }

    case 'ESPERANDO_FECHA_CONSULTA': {
      const fechaObj  = parsearFechaNatural(mensaje);
      const hoyInicio = new Date(); hoyInicio.setHours(0, 0, 0, 0);
      if (!fechaObj || isNaN(fechaObj) || fechaObj < hoyInicio) {
        await enviarTexto(phone, `😅 No entendí esa fecha.\nPrueba: *hoy*, *mañana* o *DD/MM/AAAA*`, ctx);
        return;
      }
      const fKey = fechaKey(fechaObj);
      const disponibles = await getSlotsDisponibles(fKey, botId);
      if (disponibles.length === 0) {
        await enviarTexto(phone, `😔 No hay horarios para *${nombreFecha(fechaObj)} (${formatearFecha(fechaObj)})*.\n\nPrueba con otra fecha o escribe *MENU*.`, ctx);
      } else {
        await enviarTexto(phone,
          `📅 *Disponibilidad ${nombreFecha(fechaObj)} (${formatearFecha(fechaObj)}):*\n\n` +
          disponibles.map(h => `✅ ${h}`).join('\n') +
          `\n\nPara *reservar*, escribe *MENU* y elige Reservar. 😊`, ctx
        );
      }
      break;
    }

    default:
      if (/reserv|cancha|futbol|voley|evento|jugar/i.test(mensaje)) {
        await setEstado(phone, 'MENU_PRINCIPAL', {}, botId);
        await mostrarMenuPrincipal(phone, ctx);
        return;
      }
      await resetEstado(phone, botId);
      await mostrarMenuPrincipal(phone, ctx);
  }
}

// ─── AGREGAR HORA Y PREGUNTAR ────────────────────────────
async function agregarHoraYPreguntar(phone, hora, conv, ctx) {
  const botId       = ctx?.botId || 'default';
  const precio      = cfg(ctx, 'precio_hora', 50);
  const descuento   = cfg(ctx, 'descuento_pago', 0.5);
  const horasElegidas = [...(conv.datos.horasElegidas || []), hora];
  await setEstado(phone, 'ESPERANDO_HORA', { horasElegidas }, botId);

  const total   = horasElegidas.length * precio;
  const adelanto = total * descuento;

  await enviarBotones(
    phone,
    '⏰ Hora agregada ✅',
    `✅ *${hora}* → agregada.\n\n` +
    `📋 *Horas seleccionadas:* ${horasElegidas.join(', ')}\n` +
    `🕐 Total: *${horasElegidas.length} hora(s)*\n` +
    `💰 Costo total: *S/. ${total}*\n` +
    `✅ Adelanto (${descuento * 100}%): *S/. ${adelanto}*\n\n` +
    `¿Agregas otra hora o continuamos?`,
    [
      { id: 'AGREGAR_HORA',    title: '➕ Agregar otra hora' },
      { id: 'FINALIZAR_HORAS', title: '✅ Continuar' }
    ],
    ctx
  );
}

// ─── PROCESAR BOTONES ────────────────────────────────────
async function procesarBoton(phone, buttonId, conv, ctx) {
  const botId = ctx?.botId || 'default';

  if (buttonId === 'MEN_RES') { await mostrarMenuPrincipal(phone, ctx); return; }

  if (buttonId === 'ubicaciones') {
    await enviarTexto(phone,
      `⚽ BUSCA GRASSES SINTÉTICOS CERCANOS\n\n` +
      `📍 *Comparte tu ubicación* para encontrar canchas cercanas\n\n` +
      `1️⃣ Toca 📎 (clip)\n2️⃣ Selecciona 📍 *Ubicación*\n3️⃣ Elige tu ubicación actual\n\n` +
      `¡Listo! Te buscaré canchas cercanas. ⚽`, ctx
    );
    return;
  }

  if (buttonId === 'RESERVAR')       { await mostrarProductos(phone, ctx); return; }
  if (buttonId === 'CONSULTAR')      { await setEstado(phone, 'CONSULTANDO', {}, botId); await enviarTexto(phone, '💬 ¡Con gusto! ¿En qué puedo ayudarte?', ctx); return; }
  if (buttonId === 'VER_DISPONIBLE') { await setEstado(phone, 'ESPERANDO_FECHA_CONSULTA', {}, botId); await mostrarBotonesFecha(phone, ctx, true); return; }

  // ── Tipo de cancha dinámico ──────────────────────────
  // Soporta IDs legacy (TIPO_FUTBOL etc.) y nuevos (TIPO_0, TIPO_1, TIPO_2)
  const tiposLegacy = { TIPO_FUTBOL: '⚽ Fútbol', TIPO_VOLEY: '🏐 Vóley', TIPO_EVENTO: '🎉 Evento' };
  const canchasConfig = cfg(ctx, 'canchas', ['⚽ Fútbol', '🏐 Vóley', '🎉 Evento']);

  if (tiposLegacy[buttonId]) {
    await setEstado(phone, 'ESPERANDO_DNI', { tipoCancha: tiposLegacy[buttonId] }, botId);
    await enviarTexto(phone, `🏟️ Seleccionaste: *${tiposLegacy[buttonId]}*\n\n🪪 Ingresa tu *DNI* (8 dígitos):`, ctx);
    return;
  }

  const matchTipo = buttonId.match(/^TIPO_(\d+)$/);
  if (matchTipo) {
    const idx    = parseInt(matchTipo[1]);
    const cancha = canchasConfig[idx] || canchasConfig[0];
    await setEstado(phone, 'ESPERANDO_DNI', { tipoCancha: cancha }, botId);
    await enviarTexto(phone, `🏟️ Seleccionaste: *${cancha}*\n\n🪪 Ingresa tu *DNI* (8 dígitos):`, ctx);
    return;
  }

  // ── Navegación horarios ───────────────────────────────
  if (buttonId === 'PAGINA_TARDE' || buttonId === 'PAGINA_MANANA') {
    const pagina = buttonId === 'PAGINA_TARDE' ? 'tarde' : 'manana';
    await mostrarHorasDisponibles(phone, conv.datos.fecha, conv.datos.horasElegidas || [], pagina, ctx);
    return;
  }

  // ── Fecha seleccionada del picker interactivo ─────────────
  const _matchFechaDia = buttonId.match(/^FECHA_DIA_(d+)$/);
  if (_matchFechaDia) {
    const _dias  = parseInt(_matchFechaDia[1]);
    const _fecha = new Date();
    _fecha.setHours(0, 0, 0, 0);
    _fecha.setDate(_fecha.getDate() + _dias);
    const _fKey    = fechaKey(_fecha);
    const _nombre  = nombreFecha(_fecha);
    const _display = formatearFecha(_fecha);

    if (conv.estado === 'ESPERANDO_FECHA_CONSULTA') {
      const disponibles = await getSlotsDisponibles(_fKey, botId);
      if (disponibles.length === 0) {
        await enviarTexto(phone, `😔 No hay horarios para *${_nombre} (${_display})*. Prueba otra fecha 👇`, ctx);
        await mostrarBotonesFecha(phone, ctx, true);
      } else {
        await enviarTexto(phone,
          `📅 *Disponibilidad ${_nombre} (${_display}):*

` +
          disponibles.map(h => `✅ ${h}`).join('
') +
          `

Para *reservar*, escribe *MENU* y elige Reservar. 😊`, ctx
        );
      }
    } else {
      await setEstado(phone, 'ESPERANDO_HORA', {
        fecha: _fKey, fechaDisplay: _display, fechaNombre: _nombre, horasElegidas: []
      }, botId);
      await enviarTexto(phone, `📅 *${_nombre} (${_display})* — ¡Perfecto! 🗓️

Elige tu(s) hora(s) 👇`, ctx);
      await mostrarHorasDisponibles(phone, _fKey, [], 'manana', ctx);
    }
    return;
  }

  // ── Hora seleccionada ─────────────────────────────────
  if (buttonId.startsWith('HORA_')) {
    const horaNum = buttonId.replace('HORA_', '');
    const hora    = horaNum.length === 4
      ? `${horaNum.substring(0, 2)}:${horaNum.substring(2)}`
      : horaNum;
    const pagActual      = conv.datos.paginaHoras || 'manana';
    const horasElegidas  = conv.datos.horasElegidas || [];

    if (horasElegidas.includes(hora)) {
      await enviarTexto(phone, `🛒 Las *${hora}* ya están en tu reserva.\n\nElige otra o pulsa *Continuar*.`, ctx);
      await mostrarHorasDisponibles(phone, conv.datos.fecha, horasElegidas, pagActual, ctx);
      return;
    }
    const ocupado = await isSlotOcupado(conv.datos.fecha, hora, botId);
    if (ocupado) {
      await enviarTexto(phone, `🔴 Las *${hora}* ya están ocupadas.\n\nElige otro horario (✅):`, ctx);
      await mostrarHorasDisponibles(phone, conv.datos.fecha, horasElegidas, pagActual, ctx);
      return;
    }
    await agregarHoraYPreguntar(phone, hora, conv, ctx);
    return;
  }

  if (buttonId === 'AGREGAR_HORA') {
    await mostrarHorasDisponibles(phone, conv.datos.fecha, conv.datos.horasElegidas || [], conv.datos.paginaHoras || 'manana', ctx);
    return;
  }

  // ── Finalizar selección de horas ──────────────────────
  if (buttonId === 'FINALIZAR_HORAS') {
    const datos        = conv.datos;
    const horasElegidas = datos.horasElegidas || [];
    const precio       = cfg(ctx, 'precio_hora', 50);
    const descuento    = cfg(ctx, 'descuento_pago', 0.5);

    if (horasElegidas.length === 0) {
      await enviarTexto(phone, `❌ No has seleccionado ninguna hora. Elige al menos una:`, ctx);
      await mostrarHorasDisponibles(phone, datos.fecha, [], 'manana', ctx);
      return;
    }

    const costoTotal   = horasElegidas.length * precio;
    const montoReserva = costoTotal * descuento;
    await setEstado(phone, 'CONFIRMANDO_RESERVA', { costoTotal, montoReserva }, botId);

    const d = await getEstado(phone, botId);
    const resumen =
      `📋 *RESUMEN DE RESERVA*\n` +
      `─────────────────────\n` +
      `👤 ${d.datos.nombres} ${d.datos.apellidos}\n` +
      `🪪 DNI: ${d.datos.dni}\n` +
      `🏟️ Cancha: ${d.datos.tipoCancha}\n` +
      `📅 Fecha: ${d.datos.fechaNombre} (${d.datos.fechaDisplay})\n` +
      `⏰ Hora(s): ${horasElegidas.join(', ')}\n` +
      `🕐 Total horas: ${horasElegidas.length}\n` +
      `─────────────────────\n` +
      `💰 Costo total: *S/. ${costoTotal}*\n` +
      `✅ *Adelanto ${descuento * 100}%: S/. ${montoReserva}*\n` +
      `─────────────────────\n\n¿Confirmas la reserva?`;

    await enviarBotones(phone, '📋 Confirmar Reserva', resumen, [
      { id: 'CONFIRMAR_SI', title: '✅ Sí, confirmar' },
      { id: 'CONFIRMAR_NO', title: '❌ Cancelar' }
    ], ctx);
    return;
  }

  // ── Confirmar SÍ ──────────────────────────────────────
  if (buttonId === 'CONFIRMAR_SI') {
    const datos      = conv.datos;
    const reservaId  = await crearReserva(phone, datos, botId);
    await setEstado(phone, 'ESPERANDO_COMPROBANTE', { reservaId }, botId);
    await registrarPagoPendiente(reservaId, phone, 10);

    pagosPendientes[reservaId] = {
      phone,
      timer: setTimeout(async () => {
        const reserva = await getReserva(reservaId);
        if (reserva && reserva.estado === 'PENDIENTE_PAGO') {
          await actualizarReserva(reservaId, { estado: 'CANCELADA_TIMEOUT' });
          await resetEstado(phone, botId);
          await eliminarPagoPendiente(reservaId);
          await enviarTexto(phone,
            `⏰ *Reserva cancelada*\n\nNo recibimos tu comprobante en 10 minutos.\n\nEscribe *MENU* para una nueva reserva. 😊`, ctx
          );
        }
        delete pagosPendientes[reservaId];
      }, 10 * 60 * 1000)
    };

    const mensajePago = getMensajePago(reservaId, datos.montoReserva, `${datos.nombres} ${datos.apellidos}`);
    await enviarTexto(phone, `🎉 *¡Reserva registrada!*\n\n📋 ID: *${reservaId}*\n\nAhora realiza el pago:`, ctx);
    await enviarTexto(phone, mensajePago, ctx);

    const qrUrl = getUrlQRYape();
    if (qrUrl) await enviarImagen(phone, qrUrl, `📱 QR Yape · ${reservaId} · S/. ${datos.montoReserva}`, ctx);

    await enviarTexto(phone, `📝 Escríbenos tu *número de operación* ahora 👇\n\n_(Luego envía la captura del comprobante)_`, ctx);
    return;
  }

  if (buttonId === 'CONFIRMAR_NO') {
    await resetEstado(phone, botId);
    await enviarTexto(phone, `❌ Reserva cancelada. ¡Sin problema! 😊\n\nEscribe *MENU* cuando quieras intentar de nuevo.`, ctx);
    return;
  }
}

// ─── PROCESAR IMAGEN ─────────────────────────────────────
export async function procesarImagen(phone, imageId, ctx = {}) {
  const botId = ctx.botId || 'default';
  const conv  = await getEstado(phone, botId);

  if (['PAGO_EN_REVISION', 'ESPERANDO_COMPROBANTE'].includes(conv.estado)) {
    const reservaId = conv.datos.reservaId;
    await actualizarReserva(reservaId, { comprobanteImageId: imageId, estado: 'EN_REVISION' });
    await setEstado(phone, 'PAGO_EN_REVISION', {}, botId);

    const reserva   = await getReserva(reservaId);
    const adminPhone = ctx.config?.admin_phone || process.env.ADMIN_PHONE;
    const msgAdmin  =
      `🔔 *NUEVO PAGO PARA REVISAR*\n\n` +
      `📋 *${reservaId}*\n` +
      `👤 ${reserva?.nombres} ${reserva?.apellidos}\n` +
      `🪪 DNI: ${reserva?.dni}\n📱 Tel: ${phone}\n` +
      `🏟️ ${reserva?.tipoCancha}\n📅 ${reserva?.fechaDisplay}\n` +
      `⏰ ${(reserva?.horasElegidas || reserva?.horas)?.join(', ')}\n` +
      `💰 Adelanto: S/. ${reserva?.montoReserva}\n` +
      `🔢 Op: ${reserva?.numeroOperacion || 'Pendiente'}\n\n` +
      `✅ APROBAR_${reservaId}\n❌ RECHAZAR_${reservaId}`;

    await enviarTexto(adminPhone, msgAdmin, ctx);
    await enviarTexto(phone,
      `📸 *¡Comprobante recibido!*\n\n⏳ Nuestro personal lo está revisando.\nTe avisamos pronto. 🙏`, ctx
    );
  } else {
    await enviarTexto(phone, `📸 Imagen recibida. 😊\nEscribe *MENU* para ver opciones.`, ctx);
  }
}

// ─── COMANDOS ADMIN ───────────────────────────────────────
export async function procesarComandoAdmin(phone, mensaje, ctx = {}) {
  const adminPhone = ctx.config?.admin_phone || process.env.ADMIN_PHONE;
  if (phone !== adminPhone) return false;

  const botId  = ctx.botId || 'default';
  const aprobar = mensaje.match(/^APROBAR_(RES-\d+)$/i);
  const rechazar = mensaje.match(/^RECHAZAR_(RES-\d+)$/i);

  if (aprobar) {
    const reservaId = aprobar[1].toUpperCase();
    const reserva   = await getReserva(reservaId);
    if (!reserva) { await enviarTexto(phone, `❌ Reserva ${reservaId} no encontrada.`, ctx); return true; }

    if (pagosPendientes[reservaId]?.timer) { clearTimeout(pagosPendientes[reservaId].timer); delete pagosPendientes[reservaId]; }
    await eliminarPagoPendiente(reservaId);
    await actualizarReserva(reservaId, { estado: 'CONFIRMADA' });

    const horas = reserva.horasElegidas || reserva.horas;
    const todasReservadas = await Promise.all(horas.map(h => intentarReservarSlot(reserva.fecha, h, reservaId, botId)));

    if (!todasReservadas.every(Boolean)) {
      await actualizarReserva(reservaId, { estado: 'CANCELADA_SLOTS_OCUPADOS' });
      await enviarTexto(phone, `⚠️ Reserva *${reservaId}*: Algunas horas ya fueron ocupadas. CANCELADA.`, ctx);
      await enviarTexto(reserva.phone,
        `❌ *Lo sentimos, no pudimos confirmar.*\n\nAlgunas horas fueron reservadas por otro usuario.\n\n*Tu dinero será reembolsado.*\n\nEscribe *MENU* para intentar de nuevo.`, ctx
      );
      return true;
    }

    await enviarTexto(phone, `✅ Reserva *${reservaId}* APROBADA.`, ctx);
    await enviarTexto(reserva.phone,
      `🎉 *¡RESERVA CONFIRMADA!*\n\n✅ Pago verificado.\n\n📋 ${reservaId}\n🏟️ ${reserva.tipoCancha}\n📅 ${reserva.fechaDisplay}\n⏰ ${horas?.join(', ')}\n\n¡Te esperamos! ⚽🌿`, ctx
    );
    return true;
  }

  if (rechazar) {
    const reservaId = rechazar[1].toUpperCase();
    const reserva   = await getReserva(reservaId);
    if (!reserva) { await enviarTexto(phone, `❌ Reserva ${reservaId} no encontrada.`, ctx); return true; }
    await actualizarReserva(reservaId, { estado: 'RECHAZADA' });
    await enviarTexto(phone, `❌ Reserva *${reservaId}* RECHAZADA.`, ctx);
    await enviarTexto(reserva.phone,
      `❌ *Pago rechazado*\n\nNo pudimos confirmar tu pago de ${reservaId}.\n\nEscribe *MENU* para intentar de nuevo. 😊`, ctx
    );
    return true;
  }

  return false;
}
