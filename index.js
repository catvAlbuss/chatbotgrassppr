// ============================================================
// index.js - Servidor principal del Chatbot WhatsApp
// ============================================================
import 'dotenv/config';

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { procesarMensaje, procesarImagen, procesarComandoAdmin } from './flujo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ─── SERVIR IMÁGENES QR PÚBLICAMENTE ─────────────────────
// Esto permite que WhatsApp descargue el QR desde:
// https://tu-dominio.com/qrs/qrcodeyapera.png
app.use('/qrs', express.static(path.join(__dirname, 'qrs')));

// ─── VERIFICACIÓN DEL WEBHOOK (Meta lo requiere) ─────────
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('✅ Webhook verificado por Meta');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Token de verificación incorrecto');
    res.sendStatus(403);
  }
});

// ─── RECIBIR MENSAJES DE WHATSAPP ────────────────────────
app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // Responder rápido a Meta

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) return;

    const message = messages[0];
    const phone = message.from;

    console.log(`\n📩 Mensaje de ${phone}: ${JSON.stringify(message)}`);

    // ── Texto normal ──────────────────────────────────────
    if (message.type === 'text') {
      const texto = message.text.body;

      // Verificar si es comando del admin
      const esAdmin = await procesarComandoAdmin(phone, texto);
      if (!esAdmin) {
        await procesarMensaje(phone, texto, 'text');
      }
    }

    // ── Botón interactivo ─────────────────────────────────
    else if (message.type === 'interactive') {
      const buttonId =
        message.interactive?.button_reply?.id ||
        message.interactive?.list_reply?.id;

      if (buttonId) {
        await procesarMensaje(phone, buttonId, 'interactive');
      }
    }

    // ── Imagen (comprobante de pago) ──────────────────────
    else if (message.type === 'image') {
      const imageId = message.image?.id;
      await procesarImagen(phone, imageId);
    }

    // ── Audio / video / documentos ────────────────────────
    else if (['audio', 'video', 'document', 'sticker'].includes(message.type)) {
      // Solo en estado esperando comprobante tratar como señal
      const { procesarImagen: pi } = await import('./flujo.js');
      // Ignorar, solo notificar
      const { enviarTexto } = await import('./whatsapp.js');
      const { getEstado } = await import('./storage.js');
      const conv = getEstado(phone);
      if (conv.estado === 'ESPERANDO_COMPROBANTE' || conv.estado === 'PAGO_EN_REVISION') {
        await enviarTexto(phone,
          `📎 Recibimos un archivo. Si es tu comprobante, por favor envíalo como *imagen* (foto). ¡Gracias! 📸`
        );
      } else {
        await procesarMensaje(phone, 'INICIO', 'text');
      }
    }

    // ── Otros tipos ───────────────────────────────────────
    else {
      await procesarMensaje(phone, 'INICIO', 'text');
    }

  } catch (err) {
    console.error('❌ Error procesando mensaje:', err);
  }
});

// ─── RUTA DE ESTADO ───────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    bot: 'Grass Sintético Chatbot',
    version: '2.0.0',
    uptime: process.uptime()
  });
});

// ─── INICIAR SERVIDOR ────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════╗
  ║   🌿 GRASS SINTÉTICO CHATBOT 🌿   ║
  ║         Versión 2.0.0              ║
  ║   Servidor en puerto: ${PORT}         ║
  ╚════════════════════════════════════╝
  
  ✅ Webhook: http://localhost:${PORT}/webhook
  🖼️  QR Endpoint: http://localhost:${PORT}/qrs/qrcodeyapera.png
  📱 Esperando mensajes de WhatsApp...
  `);
});
