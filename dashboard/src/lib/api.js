const BASE = '/api';

function getToken() {
  return localStorage.getItem('gb_token');
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401) {
    localStorage.removeItem('gb_token');
    window.location.href = '/admin/login';
    throw new Error('Sesión expirada');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

export const api = {
  login:       (u, p)    => request('POST', '/auth/login', { usuario: u, password: p }),
  stats:       ()        => request('GET',  '/stats'),
  reservas:    (q = {})  => request('GET',  `/reservas?${new URLSearchParams(q)}`),
  reserva:     (id)      => request('GET',  `/reservas/${id}`),
  aprobar:     (id)      => request('POST', `/reservas/${id}/aprobar`),
  rechazar:    (id)      => request('POST', `/reservas/${id}/rechazar`),
  config:      ()        => request('GET',  '/config'),
  saveConfig:  (cfg)     => request('PUT',  '/config', cfg),
  clientes:    ()        => request('GET',  '/clientes'),
  slots:       (fecha)   => request('GET',  `/slots/${fecha}`),
  usuarios:    ()        => request('GET',  '/usuarios'),
  crearUsuario:(data)    => request('POST', '/usuarios', data),
  reniec:      (dni)     => request('GET',  `/reniec/${dni}`),
  // bots
  bots:           ()          => request('GET',  '/bots'),
  bot:            (id)        => request('GET',  `/bots/${id}`),
  crearBot:       (data)      => request('POST', '/bots', data),
  actualizarBot:  (id, data)  => request('PUT',  `/bots/${id}`, data),
  eliminarBot:    (id)        => request('DELETE',`/bots/${id}`),
  botTemplates:   ()          => request('GET',  '/bots/templates/all'),
  botsPendientes: ()          => request('GET',  '/bots/pendientes'),
  verificarConexion: (id, data) => request('POST', `/bots/${id}/verificar-conexion`, data),
  asignarNumero:     (id, data) => request('POST', `/bots/${id}/asignar-numero`, data),
};
