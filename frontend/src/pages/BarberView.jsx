import React, { useState, useEffect } from 'react';
import { 
  getTurnos, avisarSiguiente, retrasarAgenda, 
  bloquearHorario, actualizarEstadoTurno, 
  invitarAdelantar, loginBarber 
} from '../services/api';
import AdminView from './AdminView';

export default function BarberView() {
  const [loggedBarber, setLoggedBarber] = useState(null);
  const [adminViewMode, setAdminViewMode] = useState('admin');
  const [loginError, setLoginError] = useState('');
  const [turnos, setTurnos] = useState([]);
  
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('info');
  const [retrasoMins, setRetrasoMins] = useState(15);
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerCount, setTimerCount] = useState(0);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (loggedBarber) {
      cargarTurnos();
    }
  }, [loggedBarber, adminViewMode]);

  useEffect(() => {
    let interval;
    if (activeTimer && timerCount > 0) {
      interval = setInterval(() => setTimerCount(prev => prev - 1), 1000);
    } else if (activeTimer && timerCount === 0) {
      hablarVoz(`El cliente ${activeTimer.nombre} no respondió, llamando al siguiente`);
      setActiveTimer(null);
    }
    return () => clearInterval(interval);
  }, [activeTimer, timerCount]);

  const todayStr = new Date().toISOString().split('T')[0];

  const showStatus = (msg, type = 'info') => {
    setStatus(msg);
    setStatusType(type);
    if (type !== 'error') setTimeout(() => setStatus(''), 4000);
  };

  const cargarTurnos = async () => {
    if (!loggedBarber) return;
    try {
      const data = await getTurnos(loggedBarber.id, todayStr);
      setTurnos(data);
    } catch (err) {
      console.error(err);
      showStatus('Error al cargar la agenda', 'error');
    }
  };

  const hablarVoz = (texto) => {
    if ('speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance(texto);
      msg.lang = 'es-ES';
      window.speechSynthesis.speak(msg);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const res = await loginBarber({ email, password });
      setLoggedBarber(res.barbero);
      if (res.token) {
        localStorage.setItem('token', res.token);
      }
      showStatus(`¡Bienvenido, ${res.barbero.nombre}!`, 'success');
    } catch (err) {
      setLoginError(err.message || 'Credenciales incorrectas. Intenta de nuevo.');
    }
  };

  const handleLogout = () => {
    setLoggedBarber(null);
    setTurnos([]);
    setActiveTimer(null);
    setLoginError('');
    localStorage.removeItem('token');
  };

  const handleAvisar = async (turno) => {
    try {
      showStatus(`Avisando a ${turno.usuario_nombre}...`);
      await avisarSiguiente(turno.id);
      setActiveTimer({ id: turno.id, nombre: turno.usuario_nombre });
      setTimerCount(5);
      showStatus('✅ Aviso enviado por WhatsApp', 'success');
    } catch (err) {
      showStatus('Error al avisar por WhatsApp', 'error');
    }
  };

  const handleRetrasar = async () => {
    if (!turnos.length) return showStatus('No tienes citas pendientes para retrasar', 'error');
    try {
      showStatus('Retrasando agenda...');
      const primerPendiente = turnos.find(t => t.estado_turno === 'pendiente');
      if (!primerPendiente) return showStatus('No hay turnos pendientes para retrasar', 'error');

      await retrasarAgenda(loggedBarber.id, {
        minutos: parseInt(retrasoMins),
        desdeHora: primerPendiente.hora_inicio
      });
      await cargarTurnos();
      showStatus(`⏱ Agenda retrasada +${retrasoMins} min. Clientes notificados.`, 'success');
    } catch (err) {
      showStatus('Error al retrasar agenda', 'error');
    }
  };

  const handleInvitarAdelanto = async () => {
    showStatus('Enviando invitaciones en cascada...');
    try {
      const res = await invitarAdelantar(loggedBarber.id, { fecha: todayStr });
      if (res.count === 0) {
        showStatus('No hay clientes flexibles disponibles hoy', 'info');
      } else {
        showStatus(`⚡ Invitaciones enviadas en cascada a ${res.count} clientes flexibles.`, 'success');
      }
    } catch (err) {
      showStatus('Error al invitar a adelantar', 'error');
    }
  };

  const handleBloquearDescanso = async (e) => {
    e.preventDefault();
    const h_start = `${todayStr} ${descansoForm.hora_inicio}`;
    const h_end = `${todayStr} ${descansoForm.hora_fin}`;

    showStatus('Bloqueando bloque de descanso...');
    try {
      await bloquearHorario(loggedBarber.id, { hora_inicio: h_start, hora_fin: h_end });
      showStatus('Bloque de descanso agregado correctamente', 'success');
      cargarTurnos();
    } catch (err) {
      showStatus('Error al registrar descanso', 'error');
    }
  };

  const handleCompletarTurno = async (turnoId, estado) => {
    try {
      await actualizarEstadoTurno(turnoId, estado);
      showStatus(`Turno marcado como: ${estado}`, 'success');
      cargarTurnos();
    } catch (err) {
      showStatus('Error al actualizar estado', 'error');
    }
  };

  const timerProgress = activeTimer ? (timerCount / 5) * 100 : 0;

  const [descansoForm, setDescansoForm] = useState({ hora_inicio: '12:00', hora_fin: '12:45' });

  // View: Login form
  if (!loggedBarber) {
    return (
      <div className="max-w-sm mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))' }}>
            <span className="text-3xl">💈</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Acceso Staff</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ingresa con tu email y contraseña</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="card p-4">
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="trabajador@barber.com"
              required
              className="w-full bg-transparent text-white placeholder-[var(--text-muted)] outline-none text-base"
            />
          </div>

          <div className="card p-4">
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-transparent text-white placeholder-[var(--text-muted)] outline-none text-base"
            />
          </div>

          {loginError && (
            <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-3 text-center">
              <p className="text-red-400 text-sm">{loginError}</p>
            </div>
          )}

          <button type="submit" className="btn-gold w-full py-4">Entrar</button>
        </form>
      </div>
    );
  }

  // View: Admin Dashboard
  if (loggedBarber.rol === 'admin' && adminViewMode === 'admin') {
    return (
      <div className="space-y-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <button className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[var(--gold)] text-[#0A0A0A] shadow-md transition-all duration-200 cursor-pointer">
            👑 Panel Administrador
          </button>
          <button 
            onClick={() => setAdminViewMode('barber')} 
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/5 text-white hover:bg-white/10 transition-all duration-200 cursor-pointer"
          >
            ✂️ Mi Agenda de Barbero
          </button>
        </div>
        <AdminView onLogout={handleLogout} />
      </div>
    );
  }

  // View: Worker Barber Dashboard
  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fadeslideup">
      {loggedBarber.rol === 'admin' && (
        <div className="flex gap-2">
          <button 
            onClick={() => setAdminViewMode('admin')} 
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/5 text-white hover:bg-white/10 transition-all duration-200 cursor-pointer"
          >
            👑 Panel Administrador
          </button>
          <button className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[var(--gold)] text-[#0A0A0A] shadow-md transition-all duration-200 cursor-pointer">
            ✂️ Mi Agenda de Barbero
          </button>
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="section-title text-xl font-bold text-white flex items-center gap-2">
              <span>💈</span> {loggedBarber.nombre}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {turnos.filter(t => t.estado_turno === 'pendiente').length} turno(s) pendiente(s) hoy
            </p>
          </div>
          <button onClick={handleLogout} className="btn-ghost text-xs">Cerrar Sesión</button>
        </div>
      </div>

      {activeTimer && (
        <div className="card border-red-500/30 animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">⏳ Esperando respuesta de {activeTimer.nombre}</span>
            <span className="badge-red">{timerCount}s</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden bg-white/5">
            <div 
              className="h-full rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${timerProgress}%`, background: 'var(--gold)' }}
            ></div>
          </div>
        </div>
      )}

      {status && (
        <div className={statusType === 'error' ? 'toast-error animate-shake' : statusType === 'success' ? 'toast-success' : 'toast-info'}>
          {status}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card space-y-3">
          <label className="label">⏱ Retrasar mi Agenda</label>
          <div className="flex gap-2">
            <select 
              value={retrasoMins} 
              onChange={e => setRetrasoMins(e.target.value)} 
              className="input-dark flex-1 text-xs"
            >
              <option value="15">+15 min</option>
              <option value="30">+30 min</option>
              <option value="45">+45 min</option>
            </select>
            <button onClick={handleRetrasar} className="px-4 py-2.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white transition-all duration-150 cursor-pointer">
              Retrasar
            </button>
          </div>
        </div>

        <div className="card flex flex-col justify-between">
          <div>
            <label className="label">⚡ Adelantar Clientes</label>
            <p className="text-[10px] mt-1 mb-2.5" style={{ color: 'var(--text-muted)' }}>
              Envía invitaciones en cascada a clientes flexibles si tienes un espacio libre.
            </p>
          </div>
          <button 
            onClick={handleInvitarAdelanto} 
            className="w-full btn-gold !py-2.5 text-xs font-bold"
          >
            Invitar en Cascada
          </button>
        </div>
      </div>

      <form onSubmit={handleBloquearDescanso} className="card space-y-3">
        <label className="label flex items-center gap-1.5">
          <span>☕</span> Registrar Hora de Descanso
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label text-[10px]">Hora Inicio</label>
            <input 
              required type="time" 
              className="input-dark text-xs" 
              value={descansoForm.hora_inicio} 
              onChange={e => setDescansoForm({...descansoForm, hora_inicio: e.target.value})} 
            />
          </div>
          <div>
            <label className="label text-[10px]">Hora Fin</label>
            <input 
              required type="time" 
              className="input-dark text-xs" 
              value={descansoForm.hora_fin} 
              onChange={e => setDescansoForm({...descansoForm, hora_fin: e.target.value})} 
            />
          </div>
        </div>
        <button type="submit" className="w-full btn-gold !py-2.5 text-xs bg-white/10 hover:bg-white/15 !text-white border border-white/10">
          Entrar en Descanso
        </button>
      </form>

      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <label className="label">Mi Agenda de Hoy</label>
          <button onClick={cargarTurnos} className="text-xs text-[var(--gold)] font-semibold hover:underline">
            🔄 Actualizar
          </button>
        </div>
        
        {turnos.length === 0 ? (
          <div className="card text-center py-12">
            <span className="text-4xl mb-3 block">📭</span>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tienes turnos programados hoy</p>
          </div>
        ) : (
          turnos.map((t) => (
            <div key={t.id} className="card relative overflow-hidden flex flex-col justify-between gap-3">
              <div 
                className="absolute top-0 left-0 w-1.5 h-full" 
                style={{ 
                  background: t.estado_turno === 'bloqueado' 
                    ? '#EF4444' 
                    : t.estado_turno === 'asistio' 
                    ? '#10B981'
                    : t.estado_turno === 'no_asistio'
                    ? '#EF4444'
                    : 'var(--gold)' 
                }}
              ></div>
              
              <div className="pl-3.5 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {t.estado_turno === 'bloqueado' ? '☕ Bloqueado / Descanso' : t.usuario_nombre}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mt-1.5 text-[10px]">
                    <span className="badge-gold">
                      🕒 {new Date(t.hora_inicio.replace(' ', 'T')).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    {t.estado_turno !== 'bloqueado' && (
                      <>
                        <span className="badge-gray">
                          {t.servicio_icono} {t.servicio_nombre}
                        </span>
                        {t.preferencia === 'puedo_adelantar' && <span className="badge-green">⚡ Flexible</span>}
                        {t.estado_turno !== 'pendiente' && (
                          <span className={t.estado_turno === 'asistio' ? 'badge-green' : 'badge-red'}>
                            {t.estado_turno.toUpperCase()}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {t.estado_turno === 'pendiente' && (
                  <button 
                    onClick={() => handleAvisar(t)} 
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--gold)] text-[#0A0A0A] hover:opacity-90 active:scale-95 transition-all duration-150 cursor-pointer shadow-lg shadow-[var(--gold)]/10 flex-shrink-0"
                  >
                    📲 Avisar Siguiente
                  </button>
                )}
              </div>

              {t.estado_turno === 'pendiente' && (
                <div className="pl-3.5 flex gap-2 pt-1.5 border-t border-white/5">
                  <button 
                    onClick={() => handleCompletarTurno(t.id, 'asistio')} 
                    className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-all duration-150 cursor-pointer"
                  >
                    ✓ Asistió
                  </button>
                  <button 
                    onClick={() => handleCompletarTurno(t.id, 'no_asistio')} 
                    className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all duration-150 cursor-pointer"
                  >
                    ✗ No Asistió
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}