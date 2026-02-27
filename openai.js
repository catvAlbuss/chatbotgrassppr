// ============================================================
// openai.js - Integración con OpenAI GPT
// ============================================================
// load env vars early in case this module is imported standalone
import 'dotenv/config';
import OpenAI from 'openai';

// validate that the key is present (dotenv should have populated it)
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not set. Please create a .env file or set the environment variable.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `Eres el asistente virtual de GRASS SINTÉTICO, una empresa que alquila canchas de grass sintético en Perú.

PRODUCTOS Y PRECIOS:
- Cancha de Fútbol: S/. 50 por hora (reserva con 50% = S/. 25)
- Cancha de Vóley: S/. 50 por hora (reserva con 50% = S/. 25)
- Eventos especiales: S/. 50 por hora (reserva con 50% = S/. 25)

HORARIOS: 7:00 AM a 10:00 PM (lunes a domingo)

POLÍTICA DE RESERVAS:
- La reserva requiere el 50% del costo total como adelanto
- El pago se realiza por Yape o Plin al número ${process.env.PAYMENT_YAPE || '987654321'}
- Una vez enviado el comprobante, el personal confirmará en minutos
- Las reservas son intransferibles

DATOS NECESARIOS PARA RESERVAR:
1. Tipo de cancha (Fútbol, Vóley o Evento)
2. DNI del cliente
3. Nombres y apellidos
4. Fecha deseada
5. Hora(s) deseada(s)

INSTRUCCIONES:
- Sé amable, claro y conciso
- Responde siempre en español
- Si te preguntan por disponibilidad, indica que el sistema mostrará los horarios disponibles
- No inventes información que no tienes
- Si hay una queja, sé empático y ofrece soluciones
- Mantén las respuestas cortas (máximo 3 párrafos)`;

export async function preguntarIA(historial, mensajeUsuario) {
  try {
    // Agregar el nuevo mensaje al historial
    const mensajes = [
      ...historial,
      { role: 'user', content: mensajeUsuario }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Más económico y rápido
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...mensajes.slice(-10) // Últimos 10 mensajes para contexto
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
