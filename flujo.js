// ============================================================
// flujo.js - Máquina de estados para el chatbot
// ============================================================
import { enviarTexto, enviarBotones, enviarLista } from './whatsapp.js';
import { preguntarIA } from './openai.js';
import { getMensajePago } from './qr.js';
import {
  getEstado, setEstado, resetEstado,
  getSlotsDisponibles, isSlotOcupado, marcarSlotOcupado,
  crearReserva, getReserva, actualizarReserva,
  pagosPendientes
} from './storage.js';

const PRECIO_HORA = 50;
const DESCUENTO_RESERVA = 0.5; // 50%

// ─── MENÚ PRINCIPAL ──────────────────────────────────────
async function mostrarMenuPrincipal(phone) {
  await enviarBotones(
    phone,
    '⚽ GRASS SINTÉTICO',
    '¡Bienvenido! Somos tu mejor opción para reservar canchas.\n\n¿Qué deseas hacer?',
    [
      { id: 'RESERVAR', title: '📅 Reservar cancha' },
      { id: 'CONSULTAR', title: '❓ Consultar info' },
      { id: 'VER_DISPONIBLE', title: '🗓️ Ver disponibilidad' }
    ]
  );
}

// ─── MENÚ DE PRODUCTOS ───────────────────────────────────
async function mostrarProductos(phone) {
  const msg =
    `🏟️ *NUESTRAS CANCHAS*\n\n` +
    `⚽ *Fútbol*\n` +
    `   Cancha de grass sintético para fútbol 7\n` +
    `   Capacidad: 14 jugadores\n\n` +
    `🏐 *Vóley*\n` +
    `   Cancha reglamentaria de vóley\n` +
    `   Iluminación LED nocturna\n\n` +
    `🎉 *Eventos*\n` +
    `   Ideal para cumpleaños, torneos y eventos corporativos\n\n` +
    `💰 *Precio: S/. ${PRECIO_HORA}/hora*\n` +
    `🎁 Reserva con solo *S/. ${PRECIO_HORA * DESCUENTO_RESERVA}* (50% adelanto)\n\n` +
    `¿Cuál cancha deseas reservar?`;

  await enviarBotones(
    phone,
    '🏟️ Nuestras Canchas',
    msg,
    [
      { id: 'TIPO_FUTBOL', title: '⚽ Fútbol' },
      { id: 'TIPO_VOLEY', title: '🏐 Vóley' },
      { id: 'TIPO_EVENTO', title: '🎉 Evento' }
    ]
  );
}

// ─── MOSTRAR DISPONIBILIDAD ──────────────────────────────
async function mostrarDisponibilidad(phone, fecha) {
  const disponibles = getSlotsDisponibles(fecha);
  if (disponibles.length === 0) {
    await enviarTexto(phone, `😔 No hay horarios disponibles para el *${fecha}*.\n\nElige otra fecha.`);
    setEstado(phone, 'ESPERANDO_FECHA');
    return;
  }

  const lista = disponibles.map(h => `✅ ${h}`).join('\n');
  await enviarTexto(
    phone,
    `📅 *Disponibilidad para ${fecha}:*\n\n${lista}\n\n` +
    `¿Qué hora deseas reservar? (Escribe en formato HH:MM, ej: 08:00)\n` +
    `Puedes reservar varias horas seguidas separadas por coma: 08:00, 09:00`
  );
}

// ─── PROCESAR MENSAJE ────────────────────────────────────
export async function procesarMensaje(phone, mensaje, tipo = 'text') {
  const conv = getEstado(phone);
  const estado = conv.estado;
  const texto = mensaje.trim().toUpperCase();

  console.log(`📱 ${phone} [${estado}]: ${mensaje}`);

  // ── ESTADO: INICIO ──────────────────────────────────
  if (estado === 'INICIO' || texto === 'HOLA' || texto === 'MENU' || texto === 'INICIO') {
    setEstado(phone, 'MENU_PRINCIPAL');
    await enviarTexto(phone, `👋 ¡Hola! Bienvenido a *GRASS SINTÉTICO* 🌿\nTu cancha favorita en Lima.`);
    await mostrarMenuPrincipal(phone);
    return;
  }

  // ── BOTONES INTERACTIVOS ────────────────────────────
  if (tipo === 'interactive') {
    await procesarBoton(phone, mensaje, conv);
    return;
  }

  // ── FLUJO DE RESERVA ────────────────────────────────
  switch (estado) {

    case 'ESPERANDO_DNI':
      if (!/^\d{8}$/.test(mensaje.trim())) {
        await enviarTexto(phone, '❌ DNI inválido. Ingresa tus *8 dígitos* del DNI:');
        return;
      }
      setEstado(phone, 'ESPERANDO_NOMBRE', { dni: mensaje.trim() });
      await enviarTexto(phone, '✅ DNI registrado.\n\n👤 Ahora ingresa tus *nombres completos*:');
      break;

    case 'ESPERANDO_NOMBRE':
      if (mensaje.trim().length < 3) {
        await enviarTexto(phone, '❌ Nombre muy corto. Ingresa tu nombre completo:');
        return;
      }
      setEstado(phone, 'ESPERANDO_APELLIDO', { nombres: mensaje.trim() });
      await enviarTexto(phone, '✅ Nombre registrado.\n\n👤 Ahora ingresa tus *apellidos*:');
      break;

    case 'ESPERANDO_APELLIDO':
      setEstado(phone, 'ESPERANDO_FECHA', { apellidos: mensaje.trim() });
      await enviarTexto(
        phone,
        `✅ Perfecto, *${conv.datos.nombres} ${mensaje.trim()}*.\n\n` +
        `📅 ¿Para qué *fecha* deseas reservar?\n` +
        `Formato: DD/MM/AAAA (ej: 25/12/2024)`
      );
      break;

    case 'ESPERANDO_FECHA': {
      const fechaRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const match = mensaje.trim().match(fechaRegex);
      if (!match) {
        await enviarTexto(phone, '❌ Formato incorrecto. Usa DD/MM/AAAA\nEjemplo: 25/12/2024');
        return;
      }
      const [, dia, mes, anio] = match;
      const fechaObj = new Date(`${anio}-${mes}-${dia}`);
      if (isNaN(fechaObj) || fechaObj < new Date()) {
        await enviarTexto(phone, '❌ Fecha inválida o ya pasó. Elige una fecha futura:');
        return;
      }
      const fechaKey = `${anio}-${mes}-${dia}`;
      setEstado(phone, 'ESPERANDO_HORA', { fecha: fechaKey, fechaDisplay: mensaje.trim() });
      await mostrarDisponibilidad(phone, fechaKey);
      break;
    }

    case 'ESPERANDO_HORA': {
      const horasInput = mensaje.trim().split(',').map(h => h.trim());
      const horaRegex = /^([01]\d|2[0-3]):00$/;
      const horasValidas = horasInput.filter(h => horaRegex.test(h));

      if (horasValidas.length === 0) {
        await enviarTexto(phone, '❌ Formato incorrecto. Usa HH:00 (ej: 08:00 o 08:00, 09:00)');
        return;
      }

      // Verificar disponibilidad
      const ocupadas = horasValidas.filter(h => isSlotOcupado(conv.datos.fecha, h));
      if (ocupadas.length > 0) {
        await enviarTexto(phone, `❌ Las siguientes horas ya están ocupadas: ${ocupadas.join(', ')}\n\nElige otros horarios.`);
        return;
      }

      const totalHoras = horasValidas.length;
      const costoTotal = totalHoras * PRECIO_HORA;
      const montoReserva = costoTotal * DESCUENTO_RESERVA;

      setEstado(phone, 'CONFIRMANDO_RESERVA', {
        horas: horasValidas,
        costoTotal,
        montoReserva
      });

      const datos = getEstado(phone).datos;
      const resumen =
        `📋 *RESUMEN DE RESERVA*\n` +
        `─────────────────────\n` +
        `👤 ${datos.nombres} ${datos.apellidos}\n` +
        `🪪 DNI: ${datos.dni}\n` +
        `🏟️ Cancha: ${datos.tipoCancha}\n` +
        `📅 Fecha: ${datos.fechaDisplay}\n` +
        `⏰ Hora(s): ${horasValidas.join(', ')}\n` +
        `🕐 Total: ${totalHoras} hora(s)\n` +
        `─────────────────────\n` +
        `💰 Costo total: S/. ${costoTotal}\n` +
        `✅ *Adelanto (50%): S/. ${montoReserva}*\n` +
        `─────────────────────\n\n` +
        `¿Confirmas la reserva?`;

      await enviarBotones(
        phone,
        '📋 Confirmar Reserva',
        resumen,
        [
          { id: 'CONFIRMAR_SI', title: '✅ Sí, confirmar' },
          { id: 'CONFIRMAR_NO', title: '❌ Cancelar' }
        ]
      );
      break;
    }

    case 'ESPERANDO_COMPROBANTE': {
      // Usuario envió número de operación
      const reservaId = conv.datos.reservaId;
      actualizarReserva(reservaId, {
        numeroOperacion: mensaje.trim(),
        estado: 'COMPROBANTE_ENVIADO'
      });

      setEstado(phone, 'PAGO_EN_REVISION');

      await enviarTexto(phone,
        `✅ *Número de operación recibido: ${mensaje.trim()}*\n\n` +
        `⏳ Ahora envía una *captura del comprobante* de pago.`
      );
      break;
    }

    case 'PAGO_EN_REVISION':
      await enviarTexto(phone,
        `⏳ Tu pago está siendo *revisado por nuestro personal*.\n\n` +
        `Te notificaremos pronto. ¡Gracias por tu paciencia! 🙏`
      );
      break;

    default:
      // Si no está en ningún flujo, usar IA para responder
      if (conv.historial) {
        const respuesta = await preguntarIA(conv.historial, mensaje);
        conv.historial.push(
          { role: 'user', content: mensaje },
          { role: 'assistant', content: respuesta }
        );
        await enviarTexto(phone, respuesta);
        await enviarTexto(phone, '\n_Escribe *MENU* para ver opciones o *RESERVAR* para hacer una reserva._');
      } else {
        setEstado(phone, 'INICIO');
        await mostrarMenuPrincipal(phone);
      }
  }
}

// ─── PROCESAR BOTONES ────────────────────────────────────
async function procesarBoton(phone, buttonId, conv) {
  switch (buttonId) {
    case 'RESERVAR':
      await mostrarProductos(phone);
      break;

    case 'CONSULTAR':
      setEstado(phone, 'CONSULTANDO');
      await enviarTexto(phone, '💬 Claro, ¿en qué puedo ayudarte? Hazme tu pregunta:');
      break;

    case 'VER_DISPONIBLE':
      setEstado(phone, 'ESPERANDO_FECHA_CONSULTA');
      await enviarTexto(phone, '📅 ¿Para qué fecha deseas ver disponibilidad?\nFormato: DD/MM/AAAA');
      break;

    case 'TIPO_FUTBOL':
    case 'TIPO_VOLEY':
    case 'TIPO_EVENTO': {
      const tipos = { TIPO_FUTBOL: '⚽ Fútbol', TIPO_VOLEY: '🏐 Vóley', TIPO_EVENTO: '🎉 Evento' };
      setEstado(phone, 'ESPERANDO_DNI', { tipoCancha: tipos[buttonId] });
      await enviarTexto(phone,
        `🏟️ Seleccionaste: *${tipos[buttonId]}*\n\n` +
        `Para continuar necesito tus datos.\n\n` +
        `🪪 Ingresa tu *número de DNI* (8 dígitos):`
      );
      break;
    }

    case 'CONFIRMAR_SI': {
      const datos = conv.datos;
      const reservaId = crearReserva(phone, datos);
      setEstado(phone, 'ESPERANDO_COMPROBANTE', { reservaId });

      // Guardar en pagos pendientes con timer de 10 minutos
      pagosPendientes[reservaId] = {
        phone,
        timer: setTimeout(async () => {
          const reserva = getReserva(reservaId);
          if (reserva && reserva.estado === 'PENDIENTE_PAGO') {
            actualizarReserva(reservaId, { estado: 'CANCELADA_TIMEOUT' });
            resetEstado(phone);
            await enviarTexto(phone,
              `⏰ *Reserva cancelada*\n\n` +
              `Tu reserva ${reservaId} fue cancelada porque no recibimos el comprobante en 10 minutos.\n\n` +
              `Escribe *MENU* para hacer una nueva reserva.`
            );
          }
          delete pagosPendientes[reservaId];
        }, 10 * 60 * 1000) // 10 minutos
      };

      const mensajePago = getMensajePago(reservaId, datos.montoReserva, `${datos.nombres} ${datos.apellidos}`);
      await enviarTexto(phone, `✅ *¡Reserva registrada!*\n\nID: *${reservaId}*\n\nAhora realiza el pago:`);
      await enviarTexto(phone, mensajePago);
      break;
    }

    case 'CONFIRMAR_NO':
      resetEstado(phone);
      await enviarTexto(phone, '❌ Reserva cancelada.\n\nEscribe *MENU* cuando quieras intentar de nuevo. 😊');
      break;

    case 'PAGO_APROBADO': {
      // Este botón lo usa el ADMIN para aprobar pagos
      const reservaId = conv.datos?.reservaId;
      if (reservaId) {
        const reserva = getReserva(reservaId);
        if (reserva) {
          // Limpiar timer
          if (pagosPendientes[reservaId]?.timer) {
            clearTimeout(pagosPendientes[reservaId].timer);
            delete pagosPendientes[reservaId];
          }
          actualizarReserva(reservaId, { estado: 'CONFIRMADA' });
          marcarSlotOcupado(reserva.fecha, reserva.horas);
          resetEstado(phone);
          await enviarTexto(reserva.phone,
            `🎉 *¡RESERVA CONFIRMADA!*\n\n` +
            `✅ Tu pago fue verificado exitosamente.\n\n` +
            `📋 *Reserva: ${reservaId}*\n` +
            `🏟️ ${reserva.tipoCancha}\n` +
            `📅 ${reserva.fechaDisplay}\n` +
            `⏰ ${reserva.horas.join(', ')}\n\n` +
            `¡Te esperamos! ⚽🌿`
          );
        }
      }
      break;
    }

    case 'PAGO_RECHAZADO': {
      const reservaId = conv.datos?.reservaId;
      if (reservaId) {
        const reserva = getReserva(reservaId);
        if (reserva) {
          actualizarReserva(reservaId, { estado: 'RECHAZADA' });
          resetEstado(phone);
          await enviarTexto(reserva.phone,
            `❌ *Pago no verificado*\n\n` +
            `No pudimos confirmar tu pago para la reserva ${reservaId}.\n\n` +
            `Por favor contáctanos o intenta nuevamente.\n` +
            `Escribe *MENU* para empezar de nuevo.`
          );
        }
      }
      break;
    }
  }
}

// ─── PROCESAR IMAGEN (comprobante de pago) ──────────────
export async function procesarImagen(phone, imageId) {
  const conv = getEstado(phone);

  if (conv.estado === 'PAGO_EN_REVISION' || conv.estado === 'ESPERANDO_COMPROBANTE') {
    const reservaId = conv.datos.reservaId;
    actualizarReserva(reservaId, {
      comprobanteImageId: imageId,
      estado: 'EN_REVISION'
    });

    setEstado(phone, 'PAGO_EN_REVISION');

    // Notificar al ADMIN
    const reserva = getReserva(reservaId);
    const msgAdmin =
      `🔔 *NUEVO PAGO PARA REVISAR*\n\n` +
      `📋 Reserva: *${reservaId}*\n` +
      `👤 ${reserva.nombres} ${reserva.apellidos}\n` +
      `🪪 DNI: ${reserva.dni}\n` +
      `📱 Tel: ${phone}\n` +
      `🏟️ ${reserva.tipoCancha}\n` +
      `📅 ${reserva.fechaDisplay}\n` +
      `⏰ ${reserva.horas?.join(', ')}\n` +
      `💰 Monto: S/. ${reserva.montoReserva}\n` +
      `🔢 Op: ${reserva.numeroOperacion || 'Pendiente'}\n\n` +
      `Responde con:\n✅ APROBAR_${reservaId}\n❌ RECHAZAR_${reservaId}`;

    await enviarTexto(process.env.ADMIN_PHONE, msgAdmin);

    await enviarTexto(phone,
      `📸 *¡Comprobante recibido!*\n\n` +
      `⏳ Nuestro personal está revisando tu pago.\n` +
      `Te notificaremos en breve. ¡Gracias! 🙏`
    );
  } else {
    await enviarTexto(phone, '📸 Imagen recibida. ¿En qué más puedo ayudarte?\nEscribe *MENU* para ver opciones.');
  }
}

// ─── PROCESAR COMANDO ADMIN ─────────────────────────────
export async function procesarComandoAdmin(phone, mensaje) {
  if (phone !== process.env.ADMIN_PHONE) return false;

  const aprobar = mensaje.match(/^APROBAR_(RES-\d+)$/i);
  const rechazar = mensaje.match(/^RECHAZAR_(RES-\d+)$/i);

  if (aprobar) {
    const reservaId = aprobar[1];
    const reserva = getReserva(reservaId);
    if (!reserva) {
      await enviarTexto(phone, `❌ Reserva ${reservaId} no encontrada.`);
      return true;
    }

    // Limpiar timer si existe
    if (pagosPendientes[reservaId]?.timer) {
      clearTimeout(pagosPendientes[reservaId].timer);
      delete pagosPendientes[reservaId];
    }

    actualizarReserva(reservaId, { estado: 'CONFIRMADA' });
    marcarSlotOcupado(reserva.fecha, reserva.horas);

    await enviarTexto(phone, `✅ Reserva *${reservaId}* APROBADA. Slot marcado como ocupado.`);
    await enviarTexto(reserva.phone,
      `🎉 *¡RESERVA CONFIRMADA!*\n\n` +
      `✅ Tu pago fue verificado.\n\n` +
      `📋 *${reservaId}*\n` +
      `🏟️ ${reserva.tipoCancha}\n` +
      `📅 ${reserva.fechaDisplay}\n` +
      `⏰ ${reserva.horas?.join(', ')}\n\n` +
      `¡Te esperamos! ⚽🌿`
    );
    return true;
  }

  if (rechazar) {
    const reservaId = rechazar[1];
    const reserva = getReserva(reservaId);
    if (!reserva) {
      await enviarTexto(phone, `❌ Reserva ${reservaId} no encontrada.`);
      return true;
    }

    actualizarReserva(reservaId, { estado: 'RECHAZADA' });
    await enviarTexto(phone, `❌ Reserva *${reservaId}* RECHAZADA.`);
    await enviarTexto(reserva.phone,
      `❌ *Pago rechazado*\n\n` +
      `No pudimos validar tu pago de la reserva ${reservaId}.\n\n` +
      `Comunícate con nosotros para más información.\n` +
      `Escribe *MENU* para intentar de nuevo.`
    );
    return true;
  }

  return false;
}
