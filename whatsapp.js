// ============================================================
// whatsapp.js - Funciones para enviar mensajes a WhatsApp
// Soporta multi-tenant: acepta ctx con token y phoneNumberId
// ============================================================
import axios from 'axios';

const BASE_URL = 'https://graph.facebook.com/v18.0';

// ─── SISTEMA DE THROTTLING PARA EVITAR RATE LIMIT ────────
const messageQueues = new Map(); // { phone: { queue: [], processing: boolean } }
const DELAY_ENTRE_MENSAJES = 800;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function procesarColaMensajes(phone) {
  if (!messageQueues.has(phone)) return;
  const cola = messageQueues.get(phone);
  if (cola.processing || cola.queue.length === 0) return;
  cola.processing = true;
  while (cola.queue.length > 0) {
    const { fn } = cola.queue.shift();
    try {
      await fn();
      if (cola.queue.length > 0) await delay(DELAY_ENTRE_MENSAJES);
    } catch (error) {
      console.error('Error procesando cola de mensajes:', error);
    }
  }
  cola.processing = false;
  messageQueues.delete(phone);
}

export function agregarAColaMensajes(phone, fn) {
  if (!messageQueues.has(phone)) {
    messageQueues.set(phone, { queue: [], processing: false });
  }
  const cola = messageQueues.get(phone);
  cola.queue.push({ fn });
  if (!cola.processing) procesarColaMensajes(phone);
}

// ─── CREDENCIALES POR CONTEXTO ────────────────────────────
// ctx es { token, phoneNumberId } — si no se pasa usa .env
function creds(ctx) {
  return {
    token:       ctx?.token       || process.env.WHATSAPP_TOKEN,
    phoneId:     ctx?.phoneNumberId || process.env.PHONE_NUMBER_ID,
  };
}

function makeHeaders(ctx) {
  return {
    Authorization: `Bearer ${creds(ctx).token}`,
    'Content-Type': 'application/json',
  };
}

function apiUrl(ctx) {
  return `${BASE_URL}/${creds(ctx).phoneId}/messages`;
}

function logTokenError(data) {
  if (data?.error?.code === 190) {
    console.error('   ↳ Token inválido o expirado.');
  }
}

// ─── ENVIAR TEXTO SIMPLE ──────────────────────────────────
export async function enviarTexto(to, texto, ctx) {
  try {
    await axios.post(
      apiUrl(ctx),
      { messaging_product: 'whatsapp', to, text: { body: texto } },
      { headers: makeHeaders(ctx) }
    );
  } catch (err) {
    const data = err.response?.data;
    console.error('❌ Error enviando texto:', data || err.message);
    logTokenError(data);
  }
}

// ─── ENVIAR IMAGEN ────────────────────────────────────────
export async function enviarImagen(to, imageUrl, caption = '', ctx) {
  try {
    await axios.post(
      apiUrl(ctx),
      { messaging_product: 'whatsapp', to, type: 'image', image: { link: imageUrl, caption } },
      { headers: makeHeaders(ctx) }
    );
  } catch (err) {
    const data = err.response?.data;
    console.error('❌ Error enviando imagen:', data || err.message);
    logTokenError(data);
  }
}

// ─── ENVIAR BOTONES INTERACTIVOS ─────────────────────────
export async function enviarBotones(to, titulo, cuerpo, botones, ctx) {
  try {
    const tituloLimpio = titulo.replace(/[*_~`]/g, '').trim();
    await axios.post(
      apiUrl(ctx),
      {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          header: { type: 'text', text: tituloLimpio },
          body:   { text: cuerpo },
          action: {
            buttons: botones.map(b => ({ type: 'reply', reply: { id: b.id, title: b.title } }))
          }
        }
      },
      { headers: makeHeaders(ctx) }
    );
  } catch (err) {
    const data = err.response?.data;
    console.error('❌ Error enviando botones:', data || err.message);
    logTokenError(data);
    // Fallback a texto
    const texto = `${titulo}\n\n${cuerpo}\n\n` + botones.map((b, i) => `${i + 1}. ${b.title}`).join('\n');
    await enviarTexto(to, texto, ctx);
  }
}

// ─── ENVIAR LISTA ────────────────────────────────────────
export async function enviarLista(to, titulo, cuerpo, botonTexto, secciones, ctx) {
  try {
    await axios.post(
      apiUrl(ctx),
      {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: { type: 'text', text: titulo },
          body:   { text: cuerpo },
          action: { button: botonTexto, sections: secciones }
        }
      },
      { headers: makeHeaders(ctx) }
    );
  } catch (err) {
    const data = err.response?.data;
    console.error('❌ Error enviando lista:', data || err.message);
    logTokenError(data);
  }
}

// ─── ENVIAR UBICACIÓN ────────────────────────────────────
export async function enviarUbicacion(to, ctx) {
  try {
    await axios.post(
      apiUrl(ctx),
      {
        messaging_product: 'whatsapp',
        to,
        type: 'location',
        location: {
          latitude:  -9.9306,
          longitude: -76.2422,
          name:    'Grass Sintético Papa Roque',
          address: 'Huánuco, Perú'
        }
      },
      { headers: makeHeaders(ctx) }
    );
  } catch (err) {
    console.error('❌ Error enviando ubicación:', err.response?.data || err.message);
  }
}

// ─── ENVIAR UBICACIÓN DE UN LUGAR ────────────────────────
export async function enviarUbicacionLugar(to, latitude, longitude, name, ctx) {
  try {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    await axios.post(
      apiUrl(ctx),
      {
        messaging_product: 'whatsapp',
        to,
        type: 'location',
        location: {
          latitude:  lat,
          longitude: lng,
          name:    name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          address: ''
        }
      },
      { headers: makeHeaders(ctx) }
    );
  } catch (err) {
    console.error('❌ Error enviando ubicación lugar:', err.response?.data || err.message);
  }
}
