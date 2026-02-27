// ============================================================
// qr.js - Generador de QR para pagos
// ============================================================
import QRCode from 'qrcode';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';

// Crear carpeta para QRs si no existe
mkdirSync('./qrs', { recursive: true });

/**
 * Genera un QR dinámico para una reserva específica y lo guarda en ./qrs/
 */
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

/**
 * Retorna la URL pública del QR de Yape (imagen fija).
 * La imagen debe estar en ./qrs/qrcodeyapera.png
 * Configura QR_PUBLIC_URL en tu .env con la URL de tu servidor.
 */
export function getUrlQRYape() {
  if (!process.env.QR_PUBLIC_URL) return null;
  return `${process.env.QR_PUBLIC_URL}/qrs/qrcodeyapera.png`;
}

/**
 * Retorna el texto formateado con instrucciones de pago.
 */
export function getMensajePago(reservaId, monto, nombreCliente) {
  return `💳 *INSTRUCCIONES DE PAGO*\n\n` +
    `📋 Reserva: *${reservaId}*\n` +
    `👤 A nombre de: ${nombreCliente}\n` +
    `💰 *Monto a pagar: S/. ${monto}*\n\n` +
    `─────────────────\n` +
    `📱 *YAPE / PLIN*\n` +
    `Número: *${process.env.PAYMENT_YAPE}*\n` +
    `Titular: *${process.env.PAYMENT_ACCOUNT}*\n` +
    `─────────────────\n\n` +
    `⚠️ En el concepto/descripción escribe:\n` +
    `*${reservaId}*\n\n` +
    `⏰ Tienes *10 minutos* para:\n` +
    `1️⃣ Enviarnos el *número de operación*\n` +
    `2️⃣ Una *captura del comprobante*\n\n` +
    `_Si no enviás en 10 min, la reserva se cancelará automáticamente._`;
}
