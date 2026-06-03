// ============================================================
// whatsapp.js - Funciones para enviar mensajes a WhatsApp
// ============================================================
import axios from 'axios';

const BASE_URL = 'https://graph.facebook.com/v18.0';

// ─── SISTEMA DE THROTTLING PARA EVITAR RATE LIMIT ────────
const messageQueues = new Map(); // { phone: { queue: [], processing: boolean } }
const DELAY_ENTRE_MENSAJES = 800; // ms entre mensajes (ajusta según necesites)

// Helper: esperar antes de enviar siguiente mensaje
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Procesar cola de mensajes para un usuario
async function procesarColaMensajes(phone) {
  if (!messageQueues.has(phone)) return;
  
  const cola = messageQueues.get(phone);
  if (cola.processing || cola.queue.length === 0) return;
  
  cola.processing = true;
  
  while (cola.queue.length > 0) {
    const { fn } = cola.queue.shift();
    try {
      await fn();
      if (cola.queue.length > 0) {
        await delay(DELAY_ENTRE_MENSAJES);
      }
    } catch (error) {
      console.error('Error procesando cola de mensajes:', error);
    }
  }
  
  cola.processing = false;
  messageQueues.delete(phone); // limpiar cuando termina
}

// Agregar mensaje a la cola
function agregarAColaMensajes(phone, fn) {
  if (!messageQueues.has(phone)) {
    messageQueues.set(phone, { queue: [], processing: false });
  }
  
  const cola = messageQueues.get(phone);
  cola.queue.push({ fn });
  
  // Iniciar procesamiento si no está activo
  if (!cola.processing) {
    procesarColaMensajes(phone);
  }
}


export async function enviarUbicacion(to) {
  try {
    await axios.post(
      `${BASE_URL}/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'location',
        location: {
          latitude: -9.9306,
          longitude: -76.2422,
          name: 'Grass Sintético Papa Roque',
          address: 'Huánuco, Perú'
        }
      },
      { headers: headers() }
    );
  } catch (err) {
    console.error('❌ Error enviando ubicación:', err.response?.data || err.message);
  }
}


export async function enviarUbicacionLugar(to, latitude, longitude, name) {
  try {

    const lat = Number(latitude);
    const lng = Number(longitude);

    console.log("📍 FINAL CHECK:", { lat, lng, name });

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.log("❌ BLOQUEADO POR DATOS INVÁLIDOS");
      return;
    }

    await axios.post(
      `${BASE_URL}/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "location",
        location: {
          latitude: lat,
          longitude: lng,
          name: name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          address: ""
        }
      },
      { headers: headers() }
    );

  } catch (err) {
    console.error("❌ Error enviando ubicación:", err.response?.data || err.message);
  }
}



function headers() {
  return {
    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json'
  };
}

// ─── ENVIAR TEXTO SIMPLE ──────────────────────────────────
export async function enviarTexto(to, texto) {
  try {
    await axios.post(
      `${BASE_URL}/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        text: { body: texto }
      },
      { headers: headers() }
    );
  } catch (err) {
    const data = err.response?.data;
    console.error('❌ Error enviando texto:', data || err.message);
    if (data?.error?.code === 190) {
      console.error('   ↳ Token inválido o expirado. Actualiza WHATSAPP_TOKEN en .env y reinicia el servidor.');
    }
  }
}

// ─── ENVIAR IMAGEN (base64 o URL) ────────────────────────
export async function enviarImagen(to, imageUrl, caption = '') {
  try {
    await axios.post(
      `${BASE_URL}/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'image',
        image: {
          link: imageUrl,
          caption
        }
      },
      { headers: headers() }
    );
  } catch (err) {
    const data = err.response?.data;
    console.error('❌ Error enviando imagen:', data || err.message);
    if (data?.error?.code === 190) {
      console.error('   ↳ Token inválido o expirado. Actualiza WHATSAPP_TOKEN en .env y reinicia el servidor.');
    }
  }
}

// ─── ENVIAR BOTONES INTERACTIVOS ─────────────────────────
export async function enviarBotones(to, titulo, cuerpo, botones) {
  // botones: [{ id: 'btn_1', title: 'Opción 1' }]
  try {
    // WhatsApp NO permite Markdown en header → limpiar asteriscos y formato
    const tituloLimpio = titulo.replace(/[*_~`]/g, '').trim();
    
    await axios.post(
      `${BASE_URL}/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          header: { type: 'text', text: tituloLimpio },
          body: { text: cuerpo },
          action: {
            buttons: botones.map(b => ({
              type: 'reply',
              reply: { id: b.id, title: b.title }
            }))
          }
        }
      },
      { headers: headers() }
    );
  } catch (err) {
    const data = err.response?.data;
    console.error('❌ Error enviando botones:', data || err.message);
    if (data?.error?.code === 190) {
      console.error('   ↳ Token inválido o expirado. Actualiza WHATSAPP_TOKEN en .env y reinicia el servidor.');
    }
    // Fallback a texto si falla
    const texto = `${titulo}\n\n${cuerpo}\n\n` + botones.map((b, i) => `${i + 1}. ${b.title}`).join('\n');
    await enviarTexto(to, texto);
  }
}

// ─── ENVIAR LISTA ────────────────────────────────────────
export async function enviarLista(to, titulo, cuerpo, botonTexto, secciones) {
  try {
    await axios.post(
      `${BASE_URL}/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: { type: 'text', text: titulo },
          body: { text: cuerpo },
          action: {
            button: botonTexto,
            sections: secciones
          }
        }
      },
      { headers: headers() }
    );
  } catch (err) {
    const data = err.response?.data;
    console.error('❌ Error enviando lista:', data || err.message);
    if (data?.error?.code === 190) {
      console.error('   ↳ Token inválido o expirado. Actualiza WHATSAPP_TOKEN en .env y reinicia el servidor.');
    }
  }
}

// ─── EXPORTAR FUNCIÓN DE COLA ──────────────────────────
export { agregarAColaMensajes };
