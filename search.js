import fetch from "node-fetch";



export async function buscarCanchas(lat, lng) {
  
  const query = `
  [out:json][timeout:25];
  (
    node["leisure"~"pitch|sports_centre"](around:3000,${lat},${lng});
    way["leisure"~"pitch|sports_centre"](around:3000,${lat},${lng});
    relation["leisure"~"pitch|sports_centre"](around:3000,${lat},${lng});
  );
  out center;
  `;

  // const query = `
  // [out:json][timeout:25];
  // (
  //   node["leisure"="pitch"]["sport"="soccer"](around:2500,${lat},${lng});
  //   way["leisure"="pitch"]["sport"="soccer"](around:2500,${lat},${lng});
  //   relation["leisure"="pitch"]["sport"="soccer"](around:2500,${lat},${lng});
  // );
  // out center;
  // `;

  const url = "https://overpass-api.de/api/interpreter";

  try {
    const res = await fetch(url, {
      method: "POST",
      body: query
    });

    const data = await res.json();

return data.elements
  .map((lugar, i) => {

    const lat = lugar.lat ?? lugar.center?.lat;
    const lng = lugar.lon ?? lugar.center?.lon;

    const latNum = Number(lat);
    const lngNum = Number(lng);

    return {
      nombre: lugar.tags?.name || `Cancha ${i + 1}`,
      lat: latNum,
      lng: lngNum
    };
  })
  .filter(l =>
    Number.isFinite(l.lat) &&
    Number.isFinite(l.lng) &&
    Math.abs(l.lat) <= 90 &&
    Math.abs(l.lng) <= 180
  );

  } catch (error) {
    console.error("Error en Overpass:", error);
    return [];
  }
}