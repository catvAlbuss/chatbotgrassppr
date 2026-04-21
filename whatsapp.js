// ============================================================
// whatsapp.js - Funciones para enviar mensajes a WhatsApp
// ============================================================
import axios from 'axios';

const BASE_URL = 'https://graph.facebook.com/v18.0';


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
    await axios.post(
      `${BASE_URL}/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          header: { type: 'text', text: titulo },
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
