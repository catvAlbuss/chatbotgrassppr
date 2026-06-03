import fetch from "node-fetch";

const RADIO = 5000;
const LIMITE = 10;

function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function buscarCanchas(lat, lng) {

  const query = `
[out:json][timeout:25];
(
  way["sport"="soccer"](around:${RADIO},${lat},${lng});
  way["sport"="football"](around:${RADIO},${lat},${lng});
  way["leisure"="pitch"](around:${RADIO},${lat},${lng});
  way["leisure"="sports_centre"](around:${RADIO},${lat},${lng});
  way["amenity"="sports_centre"](around:${RADIO},${lat},${lng});
  way["building"="sports_centre"](around:${RADIO},${lat},${lng});
  way["building"="roof"]["sport"="soccer"](around:${RADIO},${lat},${lng});
  way["building"="roof"]["leisure"="pitch"](around:${RADIO},${lat},${lng});
  node["sport"="soccer"](around:${RADIO},${lat},${lng});
  node["sport"="football"](around:${RADIO},${lat},${lng});
  node["leisure"="pitch"](around:${RADIO},${lat},${lng});
);
out center tags;
`;

  const url = "https://overpass-api.de/api/interpreter";
  const MAX_REINTENTOS = 2;
  const DELAY_MS = 2000;

  for (let intento = 0; intento <= MAX_REINTENTOS; intento++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        timeout: 30000
      });

      if (!res.ok) {
        if (res.status === 504 && intento < MAX_REINTENTOS) {
          console.warn(`Overpass API ocupada (504). Reintentando en ${DELAY_MS}ms... (intento ${intento + 1}/${MAX_REINTENTOS})`);
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
          continue;
        }
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();

      const lugares = data.elements
        .map((lugar) => {
          const tags = lugar.tags || {};

          const esCancha =
            tags.leisure === "pitch" ||
            tags.leisure === "sports_centre" ||
            tags.amenity === "sports_centre" ||
            tags.building === "sports_centre" ||
            /soccer|football/.test(tags.sport || "");

          if (!esCancha) return null;

          const latNum = Number(lugar.lat ?? lugar.center?.lat);
          const lngNum = Number(lugar.lon ?? lugar.center?.lon);

          if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
          if (Math.abs(latNum) > 90 || Math.abs(lngNum) > 180) return null;

          const nombre =
            tags.name ||
            tags["name:es"] ||
            (tags["addr:street"]
              ? `${tags["addr:street"]}${tags["addr:housenumber"] ? " " + tags["addr:housenumber"] : ""}`
              : null) ||
            tags.description ||
            null;

          return {
            nombre,
            lat: latNum,
            lng: lngNum,
            superficie: tags.surface || null,
            telefono: tags.phone || null,
            iluminacion: tags.lit === "yes",
          };
        })
        .filter(Boolean);

      // Deduplicar por proximidad ~50m
      const unicos = [];
      for (const lugar of lugares) {
        const esDuplicado = unicos.some(u =>
          Math.abs(u.lat - lugar.lat) < 0.0005 &&
          Math.abs(u.lng - lugar.lng) < 0.0005
        );
        if (!esDuplicado) unicos.push(lugar);
      }

      return unicos
        .map(l => ({
          ...l,
          distancia: Math.round(distanciaMetros(lat, lng, l.lat, l.lng)),
          nombre: l.nombre || `Grass sin nombre`
        }))
        .sort((a, b) => a.distancia - b.distancia) // más cercano primero
        .slice(0, LIMITE);

    } catch (error) {
      if (intento < MAX_REINTENTOS) {
        console.warn(`Error en intento ${intento + 1}. Reintentando...`, error.message);
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      } else {
        console.error("Error en Overpass (máx reintentos alcanzados):", error.message);
        return [];
      }
    }
  }
  
  return [];
}