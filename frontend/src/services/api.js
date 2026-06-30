const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}/api`;
};

const BASE_URL = getBaseUrl();

export const requestOTP = async (data) => {
  const response = await fetch(`${BASE_URL}/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

export const verifyOTP = async (data) => {
  const response = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const res = await response.json();
  if (response.ok && res.user) {
    localStorage.setItem('user', JSON.stringify(res.user));
  }
  return res;
};

export const loginBarber = async (credentials) => {
  const { email, password } = typeof credentials === 'object' ? credentials : {};
  const response = await fetch(`${BASE_URL}/auth/staff-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const res = await response.json();
  if (!response.ok) throw new Error(res.error || 'Error al iniciar sesión');
  if (res.token) localStorage.setItem('token', res.token);
  return res;
};

export const loginBarberByPin = async (pin) => {
  const response = await fetch(`${BASE_URL}/auth/login-barber`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin })
  });
  const res = await response.json();
  if (!response.ok) throw new Error(res.error || 'Error al iniciar sesión');
  if (res.token) localStorage.setItem('token', res.token);
  return res;
};

export const getBarberos = async () => {
  const response = await fetch(`${BASE_URL}/barberos`);
  return response.json();
};

export const getServicios = async () => {
  const response = await fetch(`${BASE_URL}/servicios`);
  return response.json();
};

export const createServicio = async (data) => {
  const response = await fetch(`${BASE_URL}/servicios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

export const updateServicio = async (id, data) => {
  const response = await fetch(`${BASE_URL}/servicios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

export const deleteServicio = async (id) => {
  const response = await fetch(`${BASE_URL}/servicios/${id}`, {
    method: 'DELETE'
  });
  return response.json();
};

export const getTurnos = async (barberoId, date = '') => {
  const url = date ? `${BASE_URL}/barberos/${barberoId}/turnos?date=${date}` : `${BASE_URL}/barberos/${barberoId}/turnos`;
  const response = await fetch(url);
  return response.json();
};

export const crearTurno = async (data) => {
  const response = await fetch(`${BASE_URL}/turnos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'Error al crear turno');
  return json;
};

export const avisarSiguiente = async (turnoId) => {
  const response = await fetch(`${BASE_URL}/turnos/${turnoId}/avisar`, {
    method: 'POST'
  });
  return response.json();
};

export const retrasarAgenda = async (barberoId, data) => {
  const response = await fetch(`${BASE_URL}/barberos/${barberoId}/retrasar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

export const bloquearHorario = async (barberoId, data) => {
  const response = await fetch(`${BASE_URL}/barberos/${barberoId}/bloquear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

export const actualizarEstadoTurno = async (turnoId, estado_turno) => {
  const response = await fetch(`${BASE_URL}/turnos/${turnoId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado_turno })
  });
  return response.json();
};

export const eliminarTurno = async (turnoId) => {
  const response = await fetch(`${BASE_URL}/turnos/${turnoId}`, {
    method: 'DELETE'
  });
  return response.json();
};

export const invitarAdelantar = async (barberoId, data) => {
  const response = await fetch(`${BASE_URL}/barberos/${barberoId}/invitar-adelantar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

// ── Auth Google + Profile Completion ──────────────────────────────────────────

export const googleLogin = async (data) => {
  const response = await fetch(`${BASE_URL}/auth/google-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

export const completeUserProfile = async (data) => {
  const response = await fetch(`${BASE_URL}/auth/complete-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

// ── Staff Management ──────────────────────────────────────────────────────────

export const inviteStaff = async (data) => {
  const response = await fetch(`${BASE_URL}/staff/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

export const validateToken = async (token) => {
  const response = await fetch(`${BASE_URL}/staff/validate-token/${token}`);
  return response.json();
};

export const completeRegistration = async (data) => {
  const response = await fetch(`${BASE_URL}/staff/complete-registration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

export const getStaffList = async () => {
  const response = await fetch(`${BASE_URL}/staff`);
  return response.json();
};

