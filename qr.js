// ============================================================
// qr.js - QR e instrucciones de pago
// ============================================================
import QRCode from 'qrcode';
import { mkdirSync } from 'fs';
import path from 'path';

mkdirSync('./qrs', { recursive: true });

export async function generarQRPago(reservaId, monto, nombreCliente) {
  const info = [
    'GRASS SINTÉTICO',
    `Reserva: ${reservaId}`,
    `Cliente: ${nombreCliente}`,
    `Monto: S/. ${monto}`,
    `Yape/Plin: ${process.env.PAYMENT_YAPE}`,
    `Titular: ${process.env.PAYMENT_ACCOUNT}`
  ].join('\n');
  const filePath = path.resolve(`./qrs/${reservaId}.png`);
  await QRCode.toFile(filePath, info, {
    color: { dark: '#1a5c2a', light: '#ffffff' }, width: 300, margin: 2
  });
  return filePath;
}

function urlPublica(pathOrUrl) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (!process.env.QR_PUBLIC_URL) return null;
  return `${process.env.QR_PUBLIC_URL.replace(/\/$/, '')}/${String(pathOrUrl).replace(/^\//, '')}`;
}

export function getUrlQRYape(config = {}) {
  return urlPublica(config?.pagos?.qr_yape || '/qrs/qrcodeyapera.png');
}

export function getUrlQRPlin(config = {}) {
  return urlPublica(config?.pagos?.qr_plin);
}

export function getMensajePago(reservaId, monto, nombreCliente, config = {}) {
  const pagos = config?.pagos || {};
  const numeros = [pagos.yape, pagos.plin].filter(Boolean).join(' / ') || process.env.PAYMENT_YAPE;
  const titular = pagos.titular || process.env.PAYMENT_ACCOUNT;
  const timeout = config?.timeout_pago_minutos || 10;
  return `💳 *INSTRUCCIONES DE PAGO*\n\n` +
    `📋 Reserva: *${reservaId}*\n` +
    `👤 A nombre de: ${nombreCliente}\n` +
    `💰 *Monto a pagar: S/. ${monto}*\n\n` +
    `─────────────────\n` +
    `📱 *YAPE / PLIN*\n` +
    `Número: *${numeros || 'Por confirmar'}*\n` +
    `Titular: *${titular || 'Por confirmar'}*\n` +
    `─────────────────\n\n` +
    `⚠️ En el concepto/descripción escribe:\n*${reservaId}*\n\n` +
    `⏰ Tienes *${timeout} minutos* para:\n` +
    `1️⃣ Enviarnos el *número de operación*\n` +
    `2️⃣ Una *captura del comprobante*\n\n` +
    `_Si no envías a tiempo, la reserva se cancelará automáticamente._`;
}
