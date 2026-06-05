// ============================================================
// openai.js - Integración con OpenAI GPT (prompts dinámicos por tipo de negocio)
// ============================================================
import 'dotenv/config';
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not set. Please create a .env file or set the environment variable.');
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── PROMPTS POR TIPO DE NEGOCIO ─────────────────────────
function generarSystemPrompt(config = {}) {
  const tipo      = config.tipo || 'grass';
  const nombre    = config.bot_nombre || config.nombre || 'Asistente Virtual';
  const moneda    = config.moneda || 'S/.';
  const apertura  = config.horarios?.apertura || '07:00';
  const cierre    = config.horarios?.cierre   || '22:00';
  const yape      = config.pagos?.yape || process.env.PAYMENT_YAPE || '987654321';
  const titular   = config.pagos?.titular || process.env.PAYMENT_ACCOUNT || '';

  const instrucciones = `
INSTRUCCIONES:
- Sé amable, claro y conciso
- Responde siempre en español
- No inventes información que no tienes
- Si hay una queja, sé empático y ofrece soluciones
- Mantén las respuestas cortas (máximo 3 párrafos)
- Si te preguntan por disponibilidad o precios exactos, indica que el sistema los mostrará al iniciar el proceso`;

  if (tipo === 'comercio') {
    const categorias = (config.categorias || ['General']).join(', ');
    const delivery   = config.delivery ? `Sí (costo: ${moneda} ${config.delivery_costo || 0})` : 'No disponible';
    return `Eres el asistente virtual de *${nombre}*, una tienda/comercio en Perú.

CATEGORÍAS DISPONIBLES: ${categorias}
HORARIOS: ${apertura} a ${cierre} (lunes a domingo)
DELIVERY: ${delivery}

POLÍTICA DE PEDIDOS:
- El pago se realiza por Yape/Plin al número ${yape} a nombre de ${titular}
- Enviar comprobante de pago para confirmar el pedido
- Los pedidos se confirman en minutos tras verificar el pago
${instrucciones}`;
  }

  if (tipo === 'restaurant') {
    const mesas    = config.mesas_disponibles || 10;
    const capacidad = config.capacidad_mesa || 4;
    const delivery  = config.delivery ? `Sí (costo: ${moneda} ${config.delivery_costo || 0})` : 'No disponible';
    return `Eres el asistente virtual de *${nombre}*, un restaurante en Perú.

MESAS DISPONIBLES: ${mesas} mesas (capacidad ${capacidad} personas c/u)
HORARIOS: ${apertura} a ${cierre}
DELIVERY: ${delivery}

POLÍTICA DE RESERVAS:
- Para reservar mesa se necesita: nombre, número de personas y fecha/hora
- El pago adelantado es opcional; confirmar con el personal
- Pago por Yape/Plin al ${yape} a nombre de ${titular}
${instrucciones}`;
  }

  // DEFAULT: grass sintético (canchas)
  const precio   = config.precio_hora || 50;
  const desc     = config.descuento_pago || 0.5;
  const canchas  = (config.canchas || ['⚽ Fútbol', '🏐 Vóley', '🎉 Evento']).join(', ');
  return `Eres el asistente virtual de *${nombre}*, una empresa que alquila canchas de grass sintético en Perú.

CANCHAS: ${canchas}
PRECIO: ${moneda} ${precio}/hora · Adelanto del ${desc * 100}% = ${moneda} ${precio * desc}
HORARIOS: ${apertura} a ${cierre} (lunes a domingo)

POLÍTICA DE RESERVAS:
- Requiere ${desc * 100}% del total como adelanto
- Pago por Yape/Plin al ${yape} a nombre de ${titular}
- Confirmar enviando captura del comprobante
- Reservas intransferibles
${instrucciones}`;
}

// ─── FUNCIÓN PRINCIPAL ───────────────────────────────────
export async function preguntarIA(historial, mensajeUsuario, config = {}) {
  try {
    const mensajes = [...historial, { role: 'user', content: mensajeUsuario }];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: generarSystemPrompt(config) },
        ...mensajes.slice(-10)
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    return response.choices[0].message.content;
  } catch (err) {
    console.error('❌ Error OpenAI:', err.message);
    return 'Lo siento, hubo un problema. Por favor intenta de nuevo.';
  }
}
