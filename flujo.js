// ============================================================
// flujo.js - Máquina de estados para el chatbot (v2.1 MySQL)
// ============================================================
import { enviarTexto, enviarBotones, enviarLista, enviarImagen } from './whatsapp.js';
import { preguntarIA } from './openai.js';
import { getMensajePago, getUrlQRYape } from './qr.js';
import {
  getEstado, setEstado, resetEstado,
  getSlotsDisponibles, isSlotOcupado, marcarSlotOcupado,
  crearReserva, getReserva, actualizarReserva,
  pagosPendientes, registrarPagoPendiente, eliminarPagoPendiente,
  agregarHistorial
} from './storage.js';
import { buscarDNI, guardarPersonaManual } from './reniec.js';
import {
  esSaludo, parsearFechaNatural, formatearFecha, fechaKey,
  nombreFecha, esFormatoDNI, extraerHoraDeTexto, normalizar
} from './lenguaje.js';

const PRECIO_HORA = 50;
const DESCUENTO_PAGO = 0.5; // 50% adelanto

// ─── MENÚ PRINCIPAL ──────────────────────────────────────
async function mostrarMenuPrincipal(phone, nombre = null) {
  const saludo = nombre ? `¡Hola, *${nombre}*! 👋` : '¡Hola! 👋';
  await enviarBotones(
    phone,
    '⚽ GRASS SINTÉTICO PAPA ROQUE',
    `${saludo} Bienvenido a tu cancha favorita en Huánuco. 🌿\n\n¿Qué deseas hacer hoy?`,
    [
      { id: 'RESERVAR', title: '📅 Reservar cancha' },
      { id: 'VER_DISPONIBLE', title: '🗓️ Ver disponibilidad' },
      { id: 'CONSULTAR', title: '❓ Consultar info' }
    ]
  );
}

// ─── MENÚ TIPO DE CANCHA ─────────────────────────────────
async function mostrarProductos(phone) {
  const msg =
    `🏟️ *NUESTRAS CANCHAS*\n\n` +
    `⚽ *Fútbol 7*\n   Grass sintético · 14 jugadores\n\n` +
    `🏐 *Vóley*\n   Cancha reglamentaria · Iluminación LED\n\n` +
    `🎉 *Eventos*\n   Cumpleaños, torneos, corporativos\n\n` +
    `💰 *S/. ${PRECIO_HORA}/hora*  🎁 Solo S/. ${PRECIO_HORA * DESCUENTO_PAGO} de adelanto (50%)\n\n` +
    `¿Cuál cancha deseas reservar?`;

  await enviarBotones(phone, '🏟️ Nuestras Canchas', msg, [
    { id: 'TIPO_FUTBOL', title: '⚽ Fútbol' },
    { id: 'TIPO_VOLEY', title: '🏐 Vóley' },
    { id: 'TIPO_EVENTO', title: '🎉 Evento' }
  ]);
}

// ─── HORAS DISPONIBLES (lista interactiva) ───────────────
async function mostrarHorasDisponibles(phone, fecha, horasElegidas = [], pagina = 'manana') {
  const disponibles = (await getSlotsDisponibles(fecha))
    .filter(h => !horasElegidas.includes(h));

  if (disponibles.length === 0) {
    await enviarTexto(phone,
      `😔 No quedan horarios disponibles para esa fecha.\n\n` +
      `Escribe otra fecha o *MENU* para volver al inicio.`
    );
    await setEstado(phone, 'ESPERANDO_FECHA');
    return;
  }

  // Dividir mañana (07-13) y tarde/noche (14-22)
  const slotManana = disponibles.filter(h => parseInt(h) < 14);
  const slotTarde = disponibles.filter(h => parseInt(h) >= 14);

  // Si todos caben en ≤9 filas, mostrar todo en una lista
  if (disponibles.length <= 9) {
    await _enviarListaHoras(phone, fecha, horasElegidas, disponibles, '⏰ Todos los horarios', null);
    return;
  }

  // Paginar: mostrar mañana o tarde según la página activa
  const esPaginaManana = pagina === 'manana';
  const slotsAMostrar = esPaginaManana ? slotManana : slotTarde;
  const titulo = esPaginaManana ? '🌅 Horarios mañana (07:00–13:00)' : '🌆 Horarios tarde/noche (14:00–22:00)';

  // Si la página activa no tiene slots, pasar a la otra
  if (slotsAMostrar.length === 0) {
    const otraPagina = esPaginaManana ? 'tarde' : 'manana';
    return mostrarHorasDisponibles(phone, fecha, horasElegidas, otraPagina);
  }

  // Guardar la página actual en el estado para los botones de navegación
  await setEstado(phone, 'ESPERANDO_HORA', { paginaHoras: pagina });

  await _enviarListaHoras(
    phone, fecha, horasElegidas,
    slotsAMostrar.slice(0, 9), // WhatsApp max 9 para dejar margen al nav
    titulo,
    esPaginaManana && slotTarde.length > 0 ? 'tarde' :
      !esPaginaManana && slotManana.length > 0 ? 'manana' : null
  );
}

/**
 * Envía la lista de WhatsApp con los slots dados.
 * Si `paginaSiguiente` no es null, añade un ítem de navegación al final.
 */
async function _enviarListaHoras(phone, fecha, horasElegidas, slots, titulo, paginaSiguiente) {
  const items = slots.map(h => ({
    id: `HORA_${h.replace(':', '')}`,
    title: `🕐 ${h}`,
    description: `S/. ${PRECIO_HORA} · disponible`
  }));

  // Añadir botón de navegación como último ítem si hay más páginas
  if (paginaSiguiente) {
    const label = paginaSiguiente === 'tarde' ? '🌆 Ver tarde/noche →' : '🌅 Ver mañana →';
    items.push({
      id: `PAGINA_${paginaSiguiente.toUpperCase()}`,
      title: label,
      description: 'Ver más horarios disponibles'
    });
  }

  const resumenElegidas = horasElegidas.length > 0
    ? `\n\n✅ *Ya elegiste:* ${horasElegidas.join(', ')} → S/. ${horasElegidas.length * PRECIO_HORA}`
    : '';

  const secciones = [{ title: titulo, rows: items }];

  await enviarLista(
    phone,
    '⏰ Elige tu hora',
    `📅 *Horarios disponibles*${resumenElegidas}\n\nElige del menú 👇`,
    '🕐 Ver horarios',
    secciones
  );
}

// ─── PROCESAR MENSAJE PRINCIPAL ──────────────────────────
export async function procesarMensaje(phone, mensaje, tipo = 'text') {
  const conv = await getEstado(phone);
  const estado = conv.estado;

  console.log(`📱 ${phone} [${estado}]: ${mensaje}`);

  // ── Botones interactivos ─────────────────────────────────
  if (tipo === 'interactive') {
    await procesarBoton(phone, mensaje, conv);
    return;
  }

  // ── Comandos globales ────────────────────────────────────
  const norm = normalizar(mensaje);
  if (['menu', 'inicio', 'volver', 'atras', 'salir', 'start'].includes(norm)) {
    await resetEstado(phone);
    await mostrarMenuPrincipal(phone);
    return;
  }

  // ── Estado INICIO o cualquier saludo ─────────────────────
  if (estado === 'INICIO' || esSaludo(mensaje)) {
    await setEstado(phone, 'MENU_PRINCIPAL');
    await enviarTexto(phone,
      `🌿 *¡Bienvenido a Grass Sintético Papa Roque!*\nTu cancha favorita en Huánuco. ⚽`
    );
    await mostrarMenuPrincipal(phone);
    return;
  }

  // ── Flujo de reserva ─────────────────────────────────────
  switch (estado) {

    // ── DNI ──────────────────────────────────────────────
    case 'ESPERANDO_DNI': {
      const dniLimpio = mensaje.trim().replace(/\s+/g, '');

      if (!esFormatoDNI(dniLimpio)) {
        await enviarTexto(phone,
          `❌ Ese DNI no parece válido 😅\n\n` +
          `Ingresa exactamente *8 dígitos*, sin espacios ni letras.\n` +
          `Ejemplo: *12345678*\n\nInténtalo de nuevo:`
        );
        return;
      }

      // Indicar que estamos buscando
      await enviarTexto(phone, `🔍 Buscando tu DNI *${dniLimpio}*... un momento 🙏`);

      // Buscar en BD → API (cache-first)
      const persona = await buscarDNI(dniLimpio);

      if (persona) {
        const origen = persona.fuente === 'bd' ? 'nuestro sistema' : 'RENIEC';
        await setEstado(phone, 'ESPERANDO_FECHA', {
          dni: dniLimpio,
          nombres: persona.nombres,
          apellidos: persona.apellidos
        });
        await enviarTexto(phone,
          `✅ ¡Te encontré en ${origen}! 😊\n\n` +
          `👤 *${persona.nombres} ${persona.apellidos}*\n` +
          `🪪 DNI: ${dniLimpio}\n\n` +
          `📅 *¿Para qué fecha quieres reservar?*\n\n` +
          `Puedes escribir:\n` +
          `• _hoy_ · _mañana_ · _pasado mañana_\n` +
          `• O la fecha: *DD/MM/AAAA* (ej: 25/03/2026)`
        );
      } else {
        // No encontrado → pedir nombre manual
        await setEstado(phone, 'ESPERANDO_NOMBRE', { dni: dniLimpio });
        await enviarTexto(phone,
          `ℹ️ No encontré tu DNI en nuestros registros.\n\n` +
          `👤 ¿Cuál es tu *nombre*? (solo nombres, sin apellidos)\n` +
          `Ejemplo: _Juan Carlos_`
        );
      }
      break;
    }

    // ── NOMBRE ──────────────────────────────────────────
    case 'ESPERANDO_NOMBRE': {
      const nombre = mensaje.trim();
      if (nombre.length < 2) {
        await enviarTexto(phone, `❌ Nombre muy corto. Escribe tu *nombre completo*:`);
        return;
      }
      await setEstado(phone, 'ESPERANDO_APELLIDO', { nombres: nombre });
      await enviarTexto(phone,
        `✅ Nombre: *${nombre}*\n\n` +
        `👤 Ahora tus *apellidos* (paterno y materno):\n` +
        `Ejemplo: _Pérez Ríos_`
      );
      break;
    }

    // ── APELLIDO ────────────────────────────────────────
    case 'ESPERANDO_APELLIDO': {
      const apellido = mensaje.trim();
      if (apellido.length < 2) {
        await enviarTexto(phone, `❌ Apellido muy corto. Ingrésalo completo:`);
        return;
      }
      await setEstado(phone, 'ESPERANDO_FECHA', { apellidos: apellido });

      // Guardar en BD para la próxima vez
      await guardarPersonaManual(conv.datos.dni, conv.datos.nombres, apellido);

      await enviarTexto(phone,
        `✅ Perfecto, *${conv.datos.nombres} ${apellido}*. 👋\n\n` +
        `📅 *¿Para qué fecha quieres reservar?*\n\n` +
        `Puedes escribir:\n` +
        `• _hoy_ · _mañana_ · _pasado mañana_\n` +
        `• O la fecha: *DD/MM/AAAA* (ej: 25/03/2026)`
      );
      break;
    }

    // ── FECHA ────────────────────────────────────────────
    case 'ESPERANDO_FECHA': {
      const fechaObj = parsearFechaNatural(mensaje);
      const hoyInicio = new Date(); hoyInicio.setHours(0, 0, 0, 0);

      if (!fechaObj || isNaN(fechaObj)) {
        await enviarTexto(phone,
          `😅 No entendí esa fecha.\n\n` +
          `Prueba con:\n` +
          `• *hoy* · *mañana* · *pasado mañana*\n` +
          `• O escribe: *DD/MM/AAAA* → ej: *25/03/2026*`
        );
        return;
      }

      if (fechaObj < hoyInicio) {
        await enviarTexto(phone,
          `❌ Esa fecha ya pasó 😅\nElige una fecha *de hoy en adelante*:`
        );
        return;
      }

      const fKey = fechaKey(fechaObj);
      const fDisp = formatearFecha(fechaObj);
      const fNom = nombreFecha(fechaObj);

      await setEstado(phone, 'ESPERANDO_HORA', {
        fecha: fKey,
        fechaDisplay: fDisp,
        fechaNombre: fNom,
        horasElegidas: []
      });

      await enviarTexto(phone,
        `📅 *${fNom} (${fDisp})* — ¡Perfecto! 🗓️\n\nElige tu(s) hora(s) 👇`
      );
      await mostrarHorasDisponibles(phone, fKey, []);
      break;
    }

    // ── HORA (fallback texto libre) ───────────────────────
    case 'ESPERANDO_HORA': {
      const horaExtraida = extraerHoraDeTexto(mensaje);
      const pagActual = conv.datos.paginaHoras || 'manana';

      if (horaExtraida) {
        const ocupado = await isSlotOcupado(conv.datos.fecha, horaExtraida);
        if (ocupado) {
          await enviarTexto(phone,
            `❌ Las *${horaExtraida}* ya están ocupadas 😔\nElige otro horario:`
          );
          await mostrarHorasDisponibles(phone, conv.datos.fecha, conv.datos.horasElegidas || [], pagActual);
          return;
        }
        await agregarHoraYPreguntar(phone, horaExtraida, conv);
      } else {
        await enviarTexto(phone, `😅 No entendí eso. Por favor usa el menú de horarios 👇`);
        await mostrarHorasDisponibles(phone, conv.datos.fecha, conv.datos.horasElegidas || [], pagActual);
      }
      break;
    }

    // ── NÚMERO DE OPERACIÓN ───────────────────────────────
    case 'ESPERANDO_COMPROBANTE': {
      const reservaId = conv.datos.reservaId;
      await actualizarReserva(reservaId, {
        numeroOperacion: mensaje.trim(),
        estado: 'COMPROBANTE_ENVIADO'
      });
      await setEstado(phone, 'PAGO_EN_REVISION');
      await enviarTexto(phone,
        `✅ *Número de operación recibido:* ${mensaje.trim()}\n\n` +
        `📸 Ahora envíanos una *captura de pantalla* del comprobante. 👇`
      );
      break;
    }

    // ── PAGO EN REVISIÓN ──────────────────────────────────
    case 'PAGO_EN_REVISION':
      await enviarTexto(phone,
        `⏳ Tu pago está siendo *revisado por nuestro personal*.\n\n` +
        `Te avisaremos pronto. ¡Gracias! 🙏\n\n` +
        `_Escribe *MENU* si necesitas ayuda._`
      );
      break;

    // ── CONSULTA CON IA ───────────────────────────────────
    case 'CONSULTANDO': {
      const historial = conv.historial || [];
      const respuesta = await preguntarIA(historial, mensaje);
      await agregarHistorial(phone, 'user', mensaje);
      await agregarHistorial(phone, 'assistant', respuesta);
      await enviarTexto(phone, respuesta);
      await enviarTexto(phone, '\n_Escribe *MENU* para ver opciones._');
      break;
    }

    // ── CONSULTA DISPONIBILIDAD ───────────────────────────
    case 'ESPERANDO_FECHA_CONSULTA': {
      const fechaObj = parsearFechaNatural(mensaje);
      const hoyInicio = new Date(); hoyInicio.setHours(0, 0, 0, 0);

      if (!fechaObj || isNaN(fechaObj) || fechaObj < hoyInicio) {
        await enviarTexto(phone,
          `😅 No entendí esa fecha.\n` +
          `Prueba: *hoy*, *mañana*, *pasado mañana* o *DD/MM/AAAA*`
        );
        return;
      }

      const fKey = fechaKey(fechaObj);
      const fDisp = formatearFecha(fechaObj);
      const fNom = nombreFecha(fechaObj);
      const disponibles = await getSlotsDisponibles(fKey);

      if (disponibles.length === 0) {
        await enviarTexto(phone,
          `😔 No hay horarios para *${fNom} (${fDisp})*.\n\n` +
          `Prueba con otra fecha o escribe *MENU*. 😊`
        );
      } else {
        const lista = disponibles.map(h => `✅ ${h}`).join('\n');
        await enviarTexto(phone,
          `📅 *Disponibilidad ${fNom} (${fDisp}):*\n\n${lista}\n\n` +
          `Para *reservar*, escribe *MENU* y elige Reservar. 😊`
        );
      }
      break;
    }

    // ── DEFAULT ───────────────────────────────────────────
    default:
      if (/reserv|cancha|futbol|voley|evento|jugar/i.test(mensaje)) {
        await setEstado(phone, 'MENU_PRINCIPAL');
        await mostrarMenuPrincipal(phone);
        return;
      }
      // Sin contexto → mostrar menú
      await resetEstado(phone);
      await mostrarMenuPrincipal(phone);
  }
}

// ─── AGREGAR HORA Y PREGUNTAR ────────────────────────────
async function agregarHoraYPreguntar(phone, hora, conv) {
  const horasElegidas = [...(conv.datos.horasElegidas || []), hora];
  await setEstado(phone, 'ESPERANDO_HORA', { horasElegidas });

  const total = horasElegidas.length * PRECIO_HORA;
  const adelanto = total * DESCUENTO_PAGO;

  await enviarBotones(
    phone,
    '⏰ Hora agregada ✅',
    `✅ *${hora}* → agregada.\n\n` +
    `📋 *Horas seleccionadas:* ${horasElegidas.join(', ')}\n` +
    `🕐 Total: *${horasElegidas.length} hora(s)*\n` +
    `💰 Costo total: *S/. ${total}*\n` +
    `✅ Adelanto (50%): *S/. ${adelanto}*\n\n` +
    `¿Agregas otra hora o continuamos?`,
    [
      { id: 'AGREGAR_HORA', title: '➕ Agregar otra hora' },
      { id: 'FINALIZAR_HORAS', title: '✅ Continuar' }
    ]
  );
}

// ─── PROCESAR BOTONES ────────────────────────────────────
async function procesarBoton(phone, buttonId, conv) {

  if (buttonId === 'RESERVAR') {
    await mostrarProductos(phone);
    return;
  }

  if (buttonId === 'CONSULTAR') {
    await setEstado(phone, 'CONSULTANDO');
    await enviarTexto(phone, '💬 ¡Con gusto! ¿En qué puedo ayudarte? Escríbeme tu pregunta:');
    return;
  }

  if (buttonId === 'VER_DISPONIBLE') {
    await setEstado(phone, 'ESPERANDO_FECHA_CONSULTA');
    await enviarTexto(phone,
      `📅 *¿Para qué fecha quieres ver disponibilidad?*\n\n` +
      `Escribe: *hoy*, *mañana*, *pasado mañana* o *DD/MM/AAAA*`
    );
    return;
  }

  // ── Tipo de cancha ─────────────────────────────────────
  if (['TIPO_FUTBOL', 'TIPO_VOLEY', 'TIPO_EVENTO'].includes(buttonId)) {
    const tipos = { TIPO_FUTBOL: '⚽ Fútbol', TIPO_VOLEY: '🏐 Vóley', TIPO_EVENTO: '🎉 Evento' };
    await setEstado(phone, 'ESPERANDO_DNI', { tipoCancha: tipos[buttonId] });
    await enviarTexto(phone,
      `🏟️ Seleccionaste: *${tipos[buttonId]}*\n\n` +
      `Para continuar necesito verificar tu identidad.\n\n` +
      `🪪 Ingresa tu *número de DNI* (8 dígitos):`
    );
    return;
  }

  // ── Navegación de páginas (mañana / tarde) ────────────
  if (buttonId === 'PAGINA_TARDE' || buttonId === 'PAGINA_MANANA') {
    const pagina = buttonId === 'PAGINA_TARDE' ? 'tarde' : 'manana';
    await mostrarHorasDisponibles(phone, conv.datos.fecha, conv.datos.horasElegidas || [], pagina);
    return;
  }

  // ── Hora seleccionada desde la lista ───────────────────
  if (buttonId.startsWith('HORA_')) {
    const hora = buttonId.replace('HORA_', '').replace(/(\d{2})(\d{2})/, '$1:$2');
    const ocupado = await isSlotOcupado(conv.datos.fecha, hora);
    if (ocupado) {
      await enviarTexto(phone, `❌ Las *${hora}* ya están ocupadas 😔\nElige otro horario:`);
      const pag = conv.datos.paginaHoras || 'manana';
      await mostrarHorasDisponibles(phone, conv.datos.fecha, conv.datos.horasElegidas || [], pag);
      return;
    }
    await agregarHoraYPreguntar(phone, hora, conv);
    return;
  }

  // ── Agregar otra hora ──────────────────────────────────
  // Vuelve a la misma página donde estaba el usuario
  if (buttonId === 'AGREGAR_HORA') {
    const pagina = conv.datos.paginaHoras || 'manana';
    await mostrarHorasDisponibles(phone, conv.datos.fecha, conv.datos.horasElegidas || [], pagina);
    return;
  }

  // ── Finalizar selección de horas ───────────────────────
  if (buttonId === 'FINALIZAR_HORAS') {
    const datos = conv.datos;
    const horasElegidas = datos.horasElegidas || [];

    if (horasElegidas.length === 0) {
      await enviarTexto(phone, `❌ No has seleccionado ninguna hora. Elige al menos una:`);
      await mostrarHorasDisponibles(phone, datos.fecha, []);
      return;
    }

    const totalHoras = horasElegidas.length;
    const costoTotal = totalHoras * PRECIO_HORA;
    const montoReserva = costoTotal * DESCUENTO_PAGO;

    await setEstado(phone, 'CONFIRMANDO_RESERVA', { costoTotal, montoReserva });

    const d = await getEstado(phone);

    const resumen =
      `📋 *RESUMEN DE RESERVA*\n` +
      `─────────────────────\n` +
      `👤 ${d.datos.nombres} ${d.datos.apellidos}\n` +
      `🪪 DNI: ${d.datos.dni}\n` +
      `🏟️ Cancha: ${d.datos.tipoCancha}\n` +
      `📅 Fecha: ${d.datos.fechaNombre} (${d.datos.fechaDisplay})\n` +
      `⏰ Hora(s): ${horasElegidas.join(', ')}\n` +
      `🕐 Total horas: ${totalHoras}\n` +
      `─────────────────────\n` +
      `💰 Costo total: *S/. ${costoTotal}*\n` +
      `✅ *Adelanto 50%: S/. ${montoReserva}*\n` +
      `─────────────────────\n\n` +
      `¿Confirmas la reserva?`;

    await enviarBotones(phone, '📋 Confirmar Reserva', resumen, [
      { id: 'CONFIRMAR_SI', title: '✅ Sí, confirmar' },
      { id: 'CONFIRMAR_NO', title: '❌ Cancelar' }
    ]);
    return;
  }

  // ── Confirmar SÍ ───────────────────────────────────────
  if (buttonId === 'CONFIRMAR_SI') {
    const datos = conv.datos;
    const reservaId = await crearReserva(phone, datos);
    await setEstado(phone, 'ESPERANDO_COMPROBANTE', { reservaId });
    await registrarPagoPendiente(reservaId, phone, 10);

    // Timer en memoria (10 min)
    pagosPendientes[reservaId] = {
      phone,
      timer: setTimeout(async () => {
        const reserva = await getReserva(reservaId);
        if (reserva && reserva.estado === 'PENDIENTE_PAGO') {
          await actualizarReserva(reservaId, { estado: 'CANCELADA_TIMEOUT' });
          await resetEstado(phone);
          await eliminarPagoPendiente(reservaId);
          await enviarTexto(phone,
            `⏰ *Reserva cancelada automáticamente*\n\n` +
            `No recibimos tu comprobante en 10 minutos.\n\n` +
            `Escribe *MENU* para hacer una nueva reserva. 😊`
          );
        }
        delete pagosPendientes[reservaId];
      }, 10 * 60 * 1000)
    };

    // Instrucciones de pago
    const mensajePago = getMensajePago(
      reservaId, datos.montoReserva,
      `${datos.nombres} ${datos.apellidos}`
    );
    await enviarTexto(phone,
      `🎉 *¡Reserva registrada!*\n\n📋 ID: *${reservaId}*\n\nAhora realiza el pago:`
    );
    await enviarTexto(phone, mensajePago);

    // QR Yape si está configurado
    const qrUrl = getUrlQRYape();
    if (qrUrl) {
      await enviarImagen(phone, qrUrl,
        `📱 QR Yape · ${reservaId} · S/. ${datos.montoReserva}`
      );
    }

    await enviarTexto(phone,
      `📝 Escríbenos tu *número de operación* ahora 👇\n\n` +
      `_(Luego envía la captura del comprobante)_`
    );
    return;
  }

  // ── Confirmar NO ───────────────────────────────────────
  if (buttonId === 'CONFIRMAR_NO') {
    await resetEstado(phone);
    await enviarTexto(phone,
      `❌ Reserva cancelada. ¡Sin problema! 😊\n\nEscribe *MENU* cuando quieras intentar de nuevo.`
    );
    return;
  }

  // ── Admin: aprobar ─────────────────────────────────────
  if (buttonId === 'PAGO_APROBADO') {
    await _aprobarReserva(phone, conv.datos?.reservaId);
    return;
  }

  if (buttonId === 'PAGO_RECHAZADO') {
    await _rechazarReserva(phone, conv.datos?.reservaId);
    return;
  }
}

// ─── HELPERS ADMIN ────────────────────────────────────────
async function _aprobarReserva(adminPhone, reservaId) {
  if (!reservaId) return;
  const reserva = await getReserva(reservaId);
  if (!reserva) return;

  if (pagosPendientes[reservaId]?.timer) {
    clearTimeout(pagosPendientes[reservaId].timer);
    delete pagosPendientes[reservaId];
  }
  await eliminarPagoPendiente(reservaId);
  await actualizarReserva(reservaId, { estado: 'CONFIRMADA' });
  await marcarSlotOcupado(reserva.fecha, reserva.horasElegidas || reserva.horas, reservaId);
  await resetEstado(adminPhone);

  await enviarTexto(reserva.phone,
    `🎉 *¡RESERVA CONFIRMADA!*\n\n` +
    `✅ Tu pago fue verificado.\n\n` +
    `📋 ${reservaId}\n🏟️ ${reserva.tipoCancha}\n` +
    `📅 ${reserva.fechaDisplay}\n⏰ ${(reserva.horasElegidas || reserva.horas)?.join(', ')}\n\n` +
    `¡Te esperamos! ⚽🌿`
  );
}

async function _rechazarReserva(adminPhone, reservaId) {
  if (!reservaId) return;
  const reserva = await getReserva(reservaId);
  if (!reserva) return;

  await actualizarReserva(reservaId, { estado: 'RECHAZADA' });
  await resetEstado(adminPhone);
  await enviarTexto(reserva.phone,
    `❌ *Pago rechazado*\n\n` +
    `No pudimos confirmar tu pago de la reserva ${reservaId}.\n\n` +
    `Escribe *MENU* para intentar de nuevo. 😊`
  );
}

// ─── PROCESAR IMAGEN ─────────────────────────────────────
export async function procesarImagen(phone, imageId) {
  const conv = await getEstado(phone);

  if (['PAGO_EN_REVISION', 'ESPERANDO_COMPROBANTE'].includes(conv.estado)) {
    const reservaId = conv.datos.reservaId;
    await actualizarReserva(reservaId, { comprobanteImageId: imageId, estado: 'EN_REVISION' });
    await setEstado(phone, 'PAGO_EN_REVISION');

    const reserva = await getReserva(reservaId);
    const msgAdmin =
      `🔔 *NUEVO PAGO PARA REVISAR*\n\n` +
      `📋 *${reservaId}*\n` +
      `👤 ${reserva?.nombres} ${reserva?.apellidos}\n` +
      `🪪 DNI: ${reserva?.dni}\n` +
      `📱 Tel: ${phone}\n` +
      `🏟️ ${reserva?.tipoCancha}\n` +
      `📅 ${reserva?.fechaDisplay}\n` +
      `⏰ ${(reserva?.horasElegidas || reserva?.horas)?.join(', ')}\n` +
      `💰 Adelanto: S/. ${reserva?.montoReserva}\n` +
      `🔢 Op: ${reserva?.numeroper || 'Pendiente'}\n\n` +
      `✅ APROBAR_${reservaId}\n❌ RECHAZAR_${reservaId}`;

    await enviarTexto(process.env.ADMIN_PHONE, msgAdmin);
    await enviarTexto(phone,
      `📸 *¡Comprobante recibido!*\n\n` +
      `⏳ Nuestro personal lo está revisando.\nTe avisamos pronto. 🙏`
    );
  } else {
    await enviarTexto(phone,
      `📸 Imagen recibida. 😊\nEscribe *MENU* para ver opciones.`
    );
  }
}

// ─── COMANDOS ADMIN ───────────────────────────────────────
export async function procesarComandoAdmin(phone, mensaje) {
  if (phone !== process.env.ADMIN_PHONE) return false;

  const aprobar = mensaje.match(/^APROBAR_(RES-\d+)$/i);
  const rechazar = mensaje.match(/^RECHAZAR_(RES-\d+)$/i);

  if (aprobar) {
    const reservaId = aprobar[1].toUpperCase();
    const reserva = await getReserva(reservaId);
    if (!reserva) {
      await enviarTexto(phone, `❌ Reserva ${reservaId} no encontrada.`);
      return true;
    }
    if (pagosPendientes[reservaId]?.timer) {
      clearTimeout(pagosPendientes[reservaId].timer);
      delete pagosPendientes[reservaId];
    }
    await eliminarPagoPendiente(reservaId);
    await actualizarReserva(reservaId, { estado: 'CONFIRMADA' });
    await marcarSlotOcupado(reserva.fecha, reserva.horasElegidas || reserva.horas, reservaId);
    await enviarTexto(phone, `✅ Reserva *${reservaId}* APROBADA.`);
    await enviarTexto(reserva.phone,
      `🎉 *¡RESERVA CONFIRMADA!*\n\n✅ Pago verificado.\n\n` +
      `📋 ${reservaId}\n🏟️ ${reserva.tipoCancha}\n` +
      `📅 ${reserva.fechaDisplay}\n⏰ ${(reserva.horasElegidas || reserva.horas)?.join(', ')}\n\n` +
      `¡Te esperamos! ⚽🌿`
    );
    return true;
  }

  if (rechazar) {
    const reservaId = rechazar[1].toUpperCase();
    const reserva = await getReserva(reservaId);
    if (!reserva) {
      await enviarTexto(phone, `❌ Reserva ${reservaId} no encontrada.`);
      return true;
    }
    await actualizarReserva(reservaId, { estado: 'RECHAZADA' });
    await enviarTexto(phone, `❌ Reserva *${reservaId}* RECHAZADA.`);
    await enviarTexto(reserva.phone,
      `❌ *Pago rechazado*\n\nNo pudimos confirmar tu pago de ${reservaId}.\n\n` +
      `Escribe *MENU* para intentar de nuevo. 😊`
    );
    return true;
  }

  return false;
}
