// ============================================================
// reniec.js - Consulta de DNI con estrategia cache-first
//
// Flujo:
//   1. Buscar DNI en MySQL (tabla `personas`)
//   2. Si no existe → llamar API de APISPerú
//   3. Si la API responde → guardar en MySQL y retornar
//   4. Si la API falla → retornar null (se pedirá nombre manual)
// ============================================================
import axios from 'axios';
import { query, queryOne } from './db.js';

const API_BASE = 'https://dniruc.apisperu.com/api/v1';

// ─── BUSCAR DNI (cache-first) ─────────────────────────────
/**
 * Retorna { nombres, apellidos, fuente } o null si no se puede resolver.
 * `fuente` puede ser 'bd' (vino de la base de datos) o 'api' (vino de APISPerú).
 */
export async function buscarDNI(dni) {
    const dniLimpio = dni.trim();

    // ── 1. Buscar en BD ──────────────────────────────────────
    try {
        const enBd = await queryOne(
            'SELECT nombres, apellidos, fuente FROM personas WHERE dni = ?',
            [dniLimpio]
        );

        if (enBd) {
            console.log(`✅ [DNI] ${dniLimpio} encontrado en BD (fuente: ${enBd.fuente})`);
            return {
                nombres: enBd.nombres,
                apellidos: enBd.apellidos,
                fuente: 'bd'
            };
        }
    } catch (err) {
        console.error('❌ [DNI] Error consultando BD:', err.message);
        // Continuar e intentar la API de todas formas
    }

    // ── 2. Llamar API APISPerú ───────────────────────────────
    const token = process.env.RENIEC_API_TOKEN;
    if (!token) {
        console.warn('⚠️  [DNI] RENIEC_API_TOKEN no configurado en .env');
        return null;
    }

    try {
        console.log(`🔍 [DNI] Consultando APISPerú para DNI: ${dniLimpio}`);
        const response = await axios.get(
            `${API_BASE}/dni/${dniLimpio}`,
            {
                params: { token },
                timeout: 8000
            }
        );

        const data = response.data;

        if (!data.success || !data.nombres) {
            console.warn(`⚠️  [DNI] API no encontró DNI ${dniLimpio}:`, data);
            return null;
        }

        // Construir apellidos desde paterno + materno
        const apellidos = [data.apellidoPaterno, data.apellidoMaterno]
            .filter(Boolean)
            .join(' ');

        // Capitalizar (la API devuelve en mayúsculas)
        const nombres = capitalizarTexto(data.nombres);
        const apellidosFmt = capitalizarTexto(apellidos);

        // ── 3. Guardar en BD para futuras consultas ──────────────
        try {
            await query(
                `INSERT INTO personas (dni, nombres, apellidos, fuente)
         VALUES (?, ?, ?, 'api')
         ON DUPLICATE KEY UPDATE
           nombres   = VALUES(nombres),
           apellidos = VALUES(apellidos),
           fuente    = 'api'`,
                [dniLimpio, nombres, apellidosFmt]
            );
            console.log(`💾 [DNI] ${dniLimpio} guardado en BD: ${nombres} ${apellidosFmt}`);
        } catch (dbErr) {
            // No bloquear si falla el guardado
            console.error('❌ [DNI] Error guardando en BD:', dbErr.message);
        }

        return { nombres, apellidos: apellidosFmt, fuente: 'api' };

    } catch (err) {
        if (err.response) {
            console.error(`❌ [DNI] API respondió ${err.response.status}:`, err.response.data);
        } else {
            console.error('❌ [DNI] Error llamando API:', err.message);
        }
        return null; // ← Flujo manual
    }
}

// ─── GUARDAR PERSONA MANUAL ───────────────────────────────
/**
 * Guarda datos ingresados manualmente en la BD
 * (para que la próxima vez no se pidan de nuevo)
 */
export async function guardarPersonaManual(dni, nombres, apellidos) {
    try {
        await query(
            `INSERT INTO personas (dni, nombres, apellidos, fuente)
       VALUES (?, ?, ?, 'manual')
       ON DUPLICATE KEY UPDATE
         nombres   = VALUES(nombres),
         apellidos = VALUES(apellidos)`,
            [dni.trim(), nombres.trim(), apellidos.trim()]
        );
        console.log(`💾 [DNI] Manual guardado: ${dni} → ${nombres} ${apellidos}`);
    } catch (err) {
        console.error('❌ [DNI] Error guardando persona manual:', err.message);
    }
}

// ─── UTILIDAD: Capitalizar texto ─────────────────────────
function capitalizarTexto(texto) {
    if (!texto) return '';
    return texto
        .toLowerCase()
        .split(' ')
        .map(palabra => {
            if (!palabra) return '';
            // Preposiciones cortas en minúscula
            if (['de', 'del', 'la', 'las', 'los', 'y'].includes(palabra)) return palabra;
            return palabra.charAt(0).toUpperCase() + palabra.slice(1);
        })
        .join(' ')
        .trim();
}
