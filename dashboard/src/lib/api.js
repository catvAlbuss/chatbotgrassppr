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

  if (res.status === 403 && data?.error?.toLowerCase().includes('suspendido')) {
    localStorage.removeItem('gb_token');
    const { default: Swal } = await import('sweetalert2');
    await Swal.fire({
      icon: 'error',
      title: 'Cuenta suspendida',
      html: `<p>${data.error}</p><p style="margin-top:.5rem;font-size:.75rem;color:#6b7280">Serás redirigido al inicio de sesión automáticamente.</p>`,
      timer: 6000,
      timerProgressBar: true,
      showConfirmButton: true,
      confirmButtonText: 'Salir ahora',
      confirmButtonColor: '#ef4444',
      background: '#111827',
      color: '#f9fafb',
      customClass: { popup: 'swal-dark-popup', title: 'swal-dark-title', timerProgressBar: 'swal-dark-timer' },
    });
    sessionStorage.setItem('gb_suspension_alert', data.error);
    window.location.href = '/admin/login';
    throw new Error(data.error);
  }

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
  clientesSistema:       ()           => request('GET',  '/clientes-sistema'),
  crearClienteSistema:   (data)       => request('POST', '/clientes-sistema', data),
  actualizarClienteSistema: (id, data) => request('PUT', `/clientes-sistema/${id}`, data),
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
  botsPendientes:    ()          => request('GET',  '/bots/pendientes'),
  verificarConexion: (id, data) => request('POST', `/bots/${id}/verificar-conexion`, data),
  asignarNumero:     (id, data) => request('POST', `/bots/${id}/asignar-numero`, data),
  embeddedSignup:    (id, data) => request('POST', `/bots/${id}/embedded-signup`, data),
  toggleActivo:      (id)       => request('POST', `/bots/${id}/toggle-activo`),
  asignarCliente:    (id, data) => request('POST', `/bots/${id}/asignar-cliente`, data),
  verificarRegistro: (id, data) => request('POST', `/bots/${id}/verificar-registro`, data),
  // estadísticas
  statsAdmin:  () => request('GET', '/stats/admin'),
  statsBot:    (id) => request('GET', `/bots/${id}/stats`),
  reservasBot: (id, q = {}) => request('GET', `/reservas?bot_id=${encodeURIComponent(id)}&${new URLSearchParams(q)}`),
  // meta utilidades
  metaNumeros: () => request('GET', '/meta/numeros'),
  // usuarios — métodos extendidos
  actualizarUsuario: (id, data) => request('PUT', `/usuarios/${id}`, data),
};
