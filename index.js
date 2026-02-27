// ============================================================
// index.js - Servidor principal del Chatbot WhatsApp
// ============================================================
// load environment variables as the first thing using ESM-friendly import
import 'dotenv/config';

import express from 'express';
import { procesarMensaje, procesarImagen, procesarComandoAdmin } from './flujo.js';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

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
      const buttonId = message.interactive?.button_reply?.id ||
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

    // ── Otros tipos ───────────────────────────────────────
    else {
      await procesarMensaje(phone, 'INICIO', 'text');
    }

  } catch (err) {
    console.error('❌ Error procesando mensaje:', err);
  }
});

// ─── RUTA DE PRUEBA ───────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    bot: 'Grass Sintético Chatbot',
    version: '1.0.0'
  });
});

// ─── INICIAR SERVIDOR ────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════╗
  ║   🌿 GRASS SINTÉTICO CHATBOT 🌿    ║
  ║   Servidor corriendo en: ${PORT}      ║
  ╚════════════════════════════════════╝
  
  ✅ Webhook: http://localhost:${PORT}/webhook
  📱 Esperando mensajes de WhatsApp...
  `);
});
