// ============================================================
// whatsapp.js - Funciones para enviar mensajes a WhatsApp
// ============================================================
import axios from 'axios';

const BASE_URL = 'https://graph.facebook.com/v18.0';

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
    console.error('❌ Error enviando texto:', err.response?.data || err.message);
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
    console.error('❌ Error enviando imagen:', err.response?.data || err.message);
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
    console.error('❌ Error enviando botones:', err.response?.data || err.message);
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
    console.error('❌ Error enviando lista:', err.response?.data || err.message);
  }
}
