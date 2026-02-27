// ============================================================
// qr.js - Generador de QR para pagos
// ============================================================
import QRCode from 'qrcode';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';

// Crear carpeta para QRs si no existe
mkdirSync('./qrs', { recursive: true });

export async function generarQRPago(reservaId, monto, nombreCliente) {
  const info = [
    `GRASS SINTÉTICO`,
    `Reserva: ${reservaId}`,
    `Cliente: ${nombreCliente}`,
    `Monto: S/. ${monto}`,
    `Yape/Plin: ${process.env.PAYMENT_YAPE}`,
    `Titular: ${process.env.PAYMENT_ACCOUNT}`
  ].join('\n');

  const filePath = path.resolve(`./qrs/${reservaId}.png`);

  await QRCode.toFile(filePath, info, {
    color: { dark: '#1a5c2a', light: '#ffffff' },
    width: 300,
    margin: 2
  });

  return filePath;
}

// Para WhatsApp necesitamos una URL pública del QR
// Por ahora retornamos el texto de pago formateado
export function getMensajePago(reservaId, monto, nombreCliente) {
  return `💳 *INSTRUCCIONES DE PAGO*\n\n` +
    `📋 Reserva: *${reservaId}*\n` +
    `👤 Cliente: ${nombreCliente}\n` +
    `💰 Monto a pagar: *S/. ${monto}*\n\n` +
    `─────────────────\n` +
    `📱 *YAPE/PLIN*\n` +
    `Número: *${process.env.PAYMENT_YAPE}*\n` +
    `Titular: ${process.env.PAYMENT_ACCOUNT}\n` +
    `─────────────────\n\n` +
    `⏰ Tienes *10 minutos* para enviar:\n` +
    `1️⃣ Tu número de operación\n` +
    `2️⃣ Captura del comprobante\n\n` +
    `_Si no enviás en 10 min, la reserva se cancelará automáticamente._`;
}
