import React, { useState, useEffect } from 'react';
import { getBarberos, getTurnos, crearTurno, getServicios } from '../services/api';
import { useNavigate } from 'react-router-dom';
import GoogleLoginButton from '../components/GoogleLoginButton';

export default function ClientView() {
  const navigate = useNavigate();
  const getStoredUser = () => {
    try {
      const stored = localStorage.getItem('user');
      if (!stored || stored === 'undefined' || stored === 'null') return null;
      return JSON.parse(stored);
    } catch (e) {
      localStorage.removeItem('user');
      return null;
    }
  };
  const [user, setUser] = useState(getStoredUser());
  const [step, setStep] = useState(user ? 'booking' : 'login');
  
  const [barberos, setBarberos] = useState([]);
  const [selectedBarbero, setSelectedBarbero] = useState(null);

  const [servicios, setServicios] = useState([]);
  const [selectedServicio, setSelectedServicio] = useState(null);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState(todayStr);
  const [hora, setHora] = useState('');
  const [turnosOcupados, setTurnosOcupados] = useState([]);
  
  const [preferencia, setPreferencia] = useState('hora_fija');
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('info');

  const generadorHoras = () => {
    const horas = [];
    let start = new Date('2000-01-01T09:00:00');
    const end = new Date('2000-01-01T18:00:00');
    while (start <= end) {
      const h = String(start.getHours()).padStart(2, '0');
      const m = String(start.getMinutes()).padStart(2, '0');
      horas.push(`${h}:${m}`);
      start.setMinutes(start.getMinutes() + 45);
    }
    return horas;
  };
  const bloquesHoras = generadorHoras();

  useEffect(() => {
    if (step === 'booking') {
      getBarberos().then(setBarberos).catch(console.error);
      getServicios().then(setServicios).catch(console.error);
    }
  }, [step]);

  useEffect(() => {
    if (selectedBarbero && fecha) {
      getTurnos(selectedBarbero.id, fecha).then(data => {
        setTurnosOcupados(data);
      }).catch(console.error);
      setHora('');
    }
  }, [selectedBarbero, fecha]);

  const showStatus = (msg, type = 'info') => {
    setStatus(msg);
    setStatusType(type);
    if (type !== 'error') setTimeout(() => setStatus(''), 4500);
  };

  /* ==================== LOGIN ==================== */
  const renderLogin = () => (
    <div className="animate-fadeslideup space-y-8">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))', boxShadow: '0 8px 32px rgba(201,168,76,0.3)' }}>
          <span className="text-4xl">💈</span>
        </div>
        <h2 className="section-title text-3xl font-bold text-white mb-2">Jimmy Barber</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Agenda tu turno en segundos</p>
      </div>

      <div className="gold-divider"></div>

      <GoogleLoginButton onLogin={(data) => {
        if (data.needsPhone) {
          navigate('/complete-profile');
        } else {
          setUser(data);
          setStep('booking');
        }
      }} />
    </div>
  );

  /* ==================== BOOKING ==================== */
  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user || !user.id) {
      setStep('login');
      return showStatus('Tu sesión expiró. Inicia sesión de nuevo.', 'error');
    }
    if (!selectedServicio) return showStatus('Elige un servicio primero', 'error');
    if (!selectedBarbero || !fecha || !hora) return showStatus('Selecciona barbero, fecha y hora', 'error');
    
    const hora_inicio = `${fecha} ${hora}`;
    const dateObj = new Date(`${fecha}T${hora}:00`);
    dateObj.setMinutes(dateObj.getMinutes() + selectedServicio.duracion_min);
    const h = String(dateObj.getHours()).padStart(2, '0');
    const m = String(dateObj.getMinutes()).padStart(2, '0');
    const hora_fin = `${fecha} ${h}:${m}`;

    showStatus('Reservando tu turno...');
    try {
      await crearTurno({
        barbero_id: selectedBarbero.id,
        usuario_id: user.id,
        servicio_id: selectedServicio.id,
        hora_inicio,
        hora_fin,
        preferencia
      });
      setStep('success');
      setStatus('');
    } catch (err) {
      showStatus(err.message || 'Error al reservar. ¿Ya tienes un turno hoy?', 'error');
    }
  };

  const renderBooking = () => (
    <form onSubmit={handleBooking} className="animate-fadeslideup space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title text-2xl font-bold text-white">Reservar Turno</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Hola, {user?.nombre} 👋</p>
        </div>
        <button type="button" onClick={() => { localStorage.removeItem('user'); setUser(null); setStep('login'); }} className="btn-ghost text-xs">Salir</button>
      </div>

      <div className="gold-divider"></div>
      
      {/* 1. Selección de Servicio */}
      <div className="space-y-3">
        <label className="label">① Elige tu servicio</label>
        <div className="grid grid-cols-1 gap-2.5">
          {servicios.map(s => (
            <div 
              key={s.id} 
              onClick={() => setSelectedServicio(s)} 
              className={`cursor-pointer rounded-2xl p-3 flex items-center justify-between transition-all duration-200 border ${
                selectedServicio?.id === s.id 
                  ? 'border-[var(--gold)] shadow-lg shadow-[var(--gold)]/5' 
                  : 'border-white/8 hover:border-white/15'
              }`}
              style={{ 
                background: selectedServicio?.id === s.id 
                  ? 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))' 
                  : 'var(--bg-card2)'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(201,168,76,0.12)' }}>
                  {s.icono}
                </div>
                <div className="text-left">
                  <span className="font-semibold text-sm text-white block">{s.nombre}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.duracion_min} minutos</span>
                </div>
              </div>
              <span className="font-bold text-sm text-[var(--gold)]">${s.precio}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Barbero */}
      {selectedServicio && (
        <div className="space-y-3 animate-fadeslideup">
          <label className="label">② Elige tu barbero</label>
          <div className="grid grid-cols-3 gap-2.5">
            {barberos.map(b => (
              <div 
                key={b.id} 
                onClick={() => setSelectedBarbero(b)} 
                className={`cursor-pointer rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 border ${
                  selectedBarbero?.id === b.id 
                    ? 'border-[var(--gold)] shadow-lg' 
                    : 'border-white/8 hover:border-white/15'
                }`}
                style={{ 
                  background: selectedBarbero?.id === b.id 
                    ? 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))' 
                    : 'var(--bg-card2)'
                }}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg" style={{ background: 'rgba(201,168,76,0.12)' }}>✂️</div>
                <span className="font-medium text-xs text-white truncate w-full text-center">{b.nombre}</span>
                {b.estado === 'disponible' && <span className="badge-green text-[10px] !px-1.5 !py-0.5">Libre</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedServicio && selectedBarbero && (
        <div className="space-y-6 animate-fadeslideup">
          {/* 3. Fecha */}
          <div className="space-y-3">
            <label className="label">③ Día de la cita</label>
            <input required type="date" min={todayStr} className="input-dark" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>

          {/* 4. Horarios */}
          <div className="space-y-3">
            <label className="label">④ Horario disponible</label>
            <div className="grid grid-cols-4 gap-2 card-inner max-h-56 overflow-y-auto">
              {bloquesHoras.map(bloque => {
                const dateTimeStr = `${fecha} ${bloque}`;
                const isOcupado = turnosOcupados.some(t => {
                  const tInicio = new Date(t.hora_inicio.replace(' ', 'T')).getTime();
                  const tFin = new Date(t.hora_fin.replace(' ', 'T')).getTime();
                  const slotTime = new Date(dateTimeStr.replace(' ', 'T')).getTime();
                  return slotTime >= tInicio && slotTime < tFin;
                });
                const isSelected = hora === bloque;

                return (
                  <div 
                    key={bloque}
                    onClick={() => !isOcupado && setHora(bloque)}
                    className={isOcupado ? 'slot-occupied' : isSelected ? 'slot-selected' : 'slot-available'}
                  >
                    {bloque}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Preferencia */}
          <div className="space-y-3">
            <label className="label">⑤ Tu preferencia</label>
            <div className="space-y-2.5">
              <div 
                onClick={() => setPreferencia('hora_fija')}
                className={`card-inner cursor-pointer transition-all duration-200 ${preferencia === 'hora_fija' ? 'ring-1 ring-[var(--gold)]' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${preferencia === 'hora_fija' ? 'border-[var(--gold)]' : 'border-white/20'}`}>
                    {preferencia === 'hora_fija' && <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--gold)' }}></div>}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white flex items-center gap-1.5">🔒 Mantener mi hora reservada</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Ideal si tienes el tiempo justo. Si hay un retraso, te avisaremos pero tu lugar está guardado.</p>
                  </div>
                </div>
              </div>
              <div 
                onClick={() => setPreferencia('puedo_adelantar')}
                className={`card-inner cursor-pointer transition-all duration-200 ${preferencia === 'puedo_adelantar' ? 'ring-1 ring-[var(--gold)]' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${preferencia === 'puedo_adelantar' ? 'border-[var(--gold)]' : 'border-white/20'}`}>
                    {preferencia === 'puedo_adelantar' ? 'border-[var(--gold)]' : 'border-white/20'}
                    {preferencia === 'puedo_adelantar' && <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--gold)' }}></div>}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white flex items-center gap-1.5">⚡ Puedo llegar antes si hay espacio</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Si alguien cancela o el barbero va más rápido, te avisaremos para adelantar tu visita.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen */}
          {hora && (
            <div className="card-inner animate-fadeslideup">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-muted)' }}>Servicio</span>
                <span className="text-white font-medium">{selectedServicio.icono} {selectedServicio.nombre}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span style={{ color: 'var(--text-muted)' }}>Barbero</span>
                <span className="text-white font-medium">{selectedBarbero.nombre}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span style={{ color: 'var(--text-muted)' }}>Fecha</span>
                <span className="text-white font-medium">{fecha}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span style={{ color: 'var(--text-muted)' }}>Hora</span>
                <span className="font-bold" style={{ color: 'var(--gold)' }}>{hora}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2 border-t border-white/5 pt-2">
                <span style={{ color: 'var(--text-muted)' }}>Precio Total</span>
                <span className="font-bold text-white text-base">${selectedServicio.precio}</span>
              </div>
            </div>
          )}

          <button type="submit" className="btn-gold animate-goldpulse">✨ Confirmar Reserva</button>
        </div>
      )}
    </form>
  );

  /* ==================== SUCCESS ==================== */
  const renderSuccess = () => (
    <div className="animate-fadeslideup text-center space-y-8 py-6">
      <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }}>
        <span className="text-5xl">✅</span>
      </div>
      <div>
        <h2 className="section-title text-3xl font-bold text-white mb-2">¡Turno Confirmado!</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Te notificaremos por WhatsApp 20 minutos antes. Estate pendiente a tu celular.</p>
      </div>
      
      <div className="card-inner text-left">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="label !mb-0">Servicio</span>
            <span className="text-white font-medium">{selectedServicio?.icono} {selectedServicio?.nombre}</span>
          </div>
          <div className="gold-divider"></div>
          <div className="flex items-center justify-between">
            <span className="label !mb-0">Barbero</span>
            <span className="text-white font-medium">{selectedBarbero?.nombre}</span>
          </div>
          <div className="gold-divider"></div>
          <div className="flex items-center justify-between">
            <span className="label !mb-0">Día</span>
            <span className="text-white font-medium">{fecha}</span>
          </div>
          <div className="gold-divider"></div>
          <div className="flex items-center justify-between">
            <span className="label !mb-0">Hora</span>
            <span className="font-bold text-lg" style={{ color: 'var(--gold)' }}>{hora}</span>
          </div>
        </div>
      </div>

      <button onClick={() => { setHora(''); setStep('booking'); }} className="btn-outline">Hacer otra reserva</button>
    </div>
  );

  /* ==================== WRAPPER ==================== */
  return (
    <div className="card max-w-md mx-auto relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.08), transparent 70%)' }}></div>
      
      <div className="relative z-10">
        {step === 'login' && renderLogin()}
        {step === 'booking' && renderBooking()}
        {step === 'success' && renderSuccess()}
        
        {status && (
          <div className={`mt-5 ${statusType === 'error' ? 'toast-error animate-shake' : statusType === 'success' ? 'toast-success' : 'toast-info'}`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}