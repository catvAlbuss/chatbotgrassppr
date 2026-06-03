// ============================================================
// index.js - Servidor principal del Chatbot WhatsApp
// Optimizado para Hostinger Node.js hosting
// ============================================================
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { procesarMensaje, procesarImagen, procesarComandoAdmin, mostrarUbiCercanas } from './flujo.js';
import { verificarConexionDB, query } from './db.js';
import { enviarTexto } from './whatsapp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ─── Hostinger asigna el puerto vía variable de entorno ──
// En Hostinger Node.js: el puerto puede ser 3000 o el que asigna el panel
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ─── SERVIR ARCHIVOS ESTÁTICOS (QR Yape) ─────────────────
app.use('/qrs', express.static(path.join(__dirname, 'qrs')));

// ─── HEALTHCHECK — Hostinger lo usa para validar que el app está vivo ─
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    bot: 'Grass Sintético Chatbot v2.1',
    uptime: Math.floor(process.uptime()),
    ts: new Date().toISOString()
  });
});

app.get('/health', (req, res) => res.status(200).send('OK'));

// ─── VERIFICACIÓN DEL WEBHOOK (Meta) ─────────────────────
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('✅ Webhook verificado por Meta');
    return res.status(200).send(challenge);
  }
  console.warn('❌ Token de verificación incorrecto');
  res.sendStatus(403);
});

// ─── RECIBIR MENSAJES DE WHATSAPP ────────────────────────
app.post('/webhook', async (req, res) => {
  // Responder 200 inmediatamente a Meta (evita reenvíos)
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;
    if (!messages?.length) return;

    const msg = messages[0];
    const phone = msg.from;

    console.log(`\n📩 [${new Date().toLocaleTimeString()}] ${phone} tipo=${msg.type}`);

    // ── Texto ─────────────────────────────────────────────
    if (msg.type === 'text') {
      const texto = msg.text.body;
      const esAdmin = await procesarComandoAdmin(phone, texto);
      if (!esAdmin) await procesarMensaje(phone, texto, 'text');
    }

    // ── Interactivo (botón / lista) ───────────────────────
    else if (msg.type === 'interactive') {
      const buttonId =
        msg.interactive?.button_reply?.id ||
        msg.interactive?.list_reply?.id;
      if (buttonId) await procesarMensaje(phone, buttonId, 'interactive');
    }

    // ── Imagen (comprobante de pago) ──────────────────────
    else if (msg.type === 'image') {
      await procesarImagen(phone, msg.image?.id);
    }

    // ── Audio / video / doc → pedir foto ────────────────
    else if (['audio', 'video', 'document', 'sticker'].includes(msg.type)) {
      const { getEstado } = await import('./storage.js');
      const { enviarTexto } = await import('./whatsapp.js');
      const conv = await getEstado(phone);
      if (['ESPERANDO_COMPROBANTE', 'PAGO_EN_REVISION'].includes(conv.estado)) {
        await enviarTexto(phone,
          `📎 Recibimos un archivo. Para el comprobante envíalo como *imagen* (foto). 📸`
        );
      } else {
        await procesarMensaje(phone, 'hola', 'text');
      }
    }

    // ── Ubicación compartida por el usuario ────────────
    else if (msg.type === 'location') {
      const { setEstado } = await import('./storage.js');
      const lat = msg.location?.latitude;
      const lng = msg.location?.longitude;
      
      if (lat && lng) {
        await setEstado(phone, 'MENU_PRINCIPAL', { lat, lng });
        await enviarTexto(phone, `📍 Ubicación guardada: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        await mostrarUbiCercanas(phone);
      }
    }

    // ── Cualquier otro → menú ─────────────────────────────
    else {
      await procesarMensaje(phone, 'hola', 'text');
    }

  } catch (err) {
    console.error('❌ Error en webhook:', err.message);
    // NO relanzar — el 200 ya fue enviado, no queremos que Meta reintente
  }
});

// ─── ARRANCAR SERVIDOR ────────────────────────────────────
async function iniciar() {
  // 1. Verificar conexión a MySQL antes de servir tráfico
  const dbOk = await verificarConexionDB();
  if (!dbOk) {
    console.warn('⚠️  Iniciando SIN base de datos. Las reservas no se guardarán.');
    console.warn('   Revisa DB_HOST, DB_USER, DB_PASSWORD, DB_NAME en .env');
    // No salir — el bot sigue funcionando para no generar 503
  }

  // 2. Iniciar servidor HTTP
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║   🌿 GRASS SINTÉTICO CHATBOT v2.1 🌿    ║
  ║   Puerto: ${PORT}  |  DB: ${dbOk ? '✅ OK' : '❌ SIN BD'}         ║
  ╚══════════════════════════════════════════╝

  🌐 URL: https://chatbotppr.construyehco.es
  ✅ Webhook: /webhook
  🖼️  QR: /qrs/qrcodeyapera.png
  💊 Health: /health
    `);
  });


  // ─── REPORTE AUTOMÁTICO DIARIO ────────────────────────────

  // async function obtenerReservasHoy() {
  //   return await queryOne(
  //     `SELECT 
  //       COUNT(*)                          AS total_reservas,
  //       SUM(costo_total)                  AS ingresos_brutos,
  //       COUNT(DISTINCT phone)             AS clientes_unicos
  //      FROM reservas
  //      WHERE fecha = CURDATE()`
  //   );
  // }

  // async function obtenerPagosPendientes() {
  //   return await queryOne(
  //     `SELECT COUNT(*) AS pendientes
  //      FROM pagos_pendientes
  //      WHERE expira_en > NOW()`
  //   );
  // }

  // async function obtenerReservasPorCancha() {
  //   return await query(
  //     `SELECT 
  //       tipo_cancha,
  //       COUNT(*) AS reservas
  //      FROM reservas
  //      WHERE fecha = CURDATE()
  //      GROUP BY tipo_cancha`
  //   );
  // }

  // // ─── REPORTE AUTOMÁTICO DIARIO (cada 24 horas) ───────────
  // const INTERVALO_REPORTE_MS =1000;

  // async function enviarReporteDiario() {
  //   try {
  //     const { enviarTexto } = await import('./whatsapp.js');

  //     const [resumen, pendientes, porCancha] = await Promise.all([
  //       obtenerReservasHoy(),
  //       obtenerPagosPendientes(),
  //       obtenerReservasPorCancha(),
  //     ]);

  //     const fecha = new Date().toLocaleDateString('es-PE', {
  //       weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  //     });

  //     // Construir líneas por tipo de cancha
  //     const lineasCancha = porCancha.length
  //       ? porCancha.map(r => `   • ${r.tipo_cancha}: ${r.reservas} reserva(s)`).join('\n')
  //       : '   • Sin reservas aún';

  //     const mensaje =
  //       `📊 *Reporte Diario — Grass Sintético*\n` +
  //       `📅 ${fecha}\n\n` +
  //       `👥 Clientes únicos:     ${resumen?.clientes_unicos  ?? 0}\n` +
  //       `📋 Reservas del día:    ${resumen?.total_reservas   ?? 0}\n` +
  //       `💰 Ingresos del día:    S/ ${Number(resumen?.ingresos_brutos ?? 0).toFixed(2)}\n` +
  //       `⏳ Pagos pendientes:    ${pendientes?.pendientes    ?? 0}\n\n` +
  //       `🏟️ *Por tipo de cancha:*\n${lineasCancha}`;

  //     await enviarTexto(process.env.ADMIN_PHONE, mensaje);
  //     console.log('📊 Reporte diario enviado correctamente');

  //   } catch (err) {
  //     console.error('❌ Error enviando reporte diario:', err.message);
  //   }
  // }

  // // Ejecutar al arrancar y luego cada 24 horas
  // enviarReporteDiario();
  // setInterval(enviarReporteDiario, INTERVALO_REPORTE_MS);


}

// ─── MANEJADORES DE ERRORES GLOBALES ─────────────────────
// Evitan que Node.js muera por promesas no manejadas (causa del 503)
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  unhandledRejection:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️  uncaughtException:', err.message);
  // No salir en producción para evitar 503
});

// Iniciar
iniciar();
