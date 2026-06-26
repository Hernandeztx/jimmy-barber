import React, { useState, useEffect } from 'react';
import { 
  getBarberos, getTurnos, getServicios, createServicio, 
  updateServicio, deleteServicio, bloquearHorario, 
  actualizarEstadoTurno, eliminarTurno 
} from '../services/api';

export default function AdminView({ onLogout }) {
  const [activeTab, setActiveTab] = useState('agenda'); // agenda | servicios | metricas
  const [barberos, setBarberos] = useState([]);
  const [selectedBarbero, setSelectedBarbero] = useState(null);
  const [turnos, setTurnos] = useState([]);
  const [servicios, setServicios] = useState([]);
  
  // Date filter for agenda
  const todayStr = new Date().toISOString().split('T')[0];
  const [fechaAgenda, setFechaAgenda] = useState(todayStr);

  // General Block Form
  const [blockData, setBlockData] = useState({ fecha: todayStr, hora_inicio: '09:00', hora_fin: '09:45' });

  // Service Form (Add / Edit)
  const [serviceForm, setServiceForm] = useState({ id: null, nombre: '', icono: '✂️', duracion_min: 45, precio: 15000 });
  const [isEditingService, setIsEditingService] = useState(false);

  // Status message
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('info'); // info | success | error

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    if (selectedBarbero && fechaAgenda) {
      cargarTurnosAdmin();
    }
  }, [selectedBarbero, fechaAgenda]);

  const showStatus = (msg, type = 'info') => {
    setStatus(msg);
    setStatusType(type);
    if (type !== 'error') setTimeout(() => setStatus(''), 4000);
  };

  const cargarDatosIniciales = async () => {
    try {
      const barbs = await getBarberos();
      setBarberos(barbs);
      if (barbs.length > 0) setSelectedBarbero(barbs[0]);

      const servs = await getServicios();
      setServicios(servs);
    } catch (err) {
      console.error(err);
      showStatus('Error al cargar datos', 'error');
    }
  };

  const cargarTurnosAdmin = async () => {
    if (!selectedBarbero) return;
    try {
      const data = await getTurnos(selectedBarbero.id, fechaAgenda);
      setTurnos(data);
    } catch (err) {
      console.error(err);
      showStatus('Error al cargar turnos', 'error');
    }
  };

  // Turn status change
  const handleUpdateStatus = async (turnoId, nuevoEstado) => {
    try {
      await actualizarEstadoTurno(turnoId, nuevoEstado);
      showStatus('Estado de turno actualizado', 'success');
      cargarTurnosAdmin();
    } catch (err) {
      showStatus('Error al actualizar estado', 'error');
    }
  };

  // Delete Turn (or Release block)
  const handleDeleteTurno = async (turnoId) => {
    if (!window.confirm('¿Estás seguro de eliminar este turno o bloqueo?')) return;
    try {
      await eliminarTurno(turnoId);
      showStatus('Turno/Horario eliminado con éxito', 'success');
      cargarTurnosAdmin();
    } catch (err) {
      showStatus('Error al eliminar', 'error');
    }
  };

  // Block time slot for ALL barbers
  const handleBlockGeneral = async (e) => {
    e.preventDefault();
    const h_start = `${blockData.fecha} ${blockData.hora_inicio}`;
    const h_end = `${blockData.fecha} ${blockData.hora_fin}`;

    showStatus('Bloqueando horarios generales...');
    try {
      for (const barb of barberos) {
        await bloquearHorario(barb.id, { hora_inicio: h_start, hora_fin: h_end });
      }
      showStatus('Horarios bloqueados para todos los barberos', 'success');
      cargarTurnosAdmin();
    } catch (err) {
      showStatus('Error al bloquear horarios', 'error');
    }
  };

  // CRUD Servicios
  const handleSaveServicio = async (e) => {
    e.preventDefault();
    try {
      if (isEditingService) {
        await updateServicio(serviceForm.id, serviceForm);
        showStatus('Servicio actualizado correctamente', 'success');
      } else {
        await createServicio(serviceForm);
        showStatus('Servicio creado correctamente', 'success');
      }
      // Reset form
      setServiceForm({ id: null, nombre: '', icono: '✂️', duracion_min: 45, precio: 15000 });
      setIsEditingService(false);
      const servs = await getServicios();
      setServicios(servs);
    } catch (err) {
      showStatus('Error al guardar servicio', 'error');
    }
  };

  const handleEditServiceClick = (srv) => {
    setServiceForm(srv);
    setIsEditingService(true);
  };

  const handleDeleteServiceClick = async (srvId) => {
    if (!window.confirm('¿Seguro que deseas eliminar este servicio?')) return;
    try {
      await deleteServicio(srvId);
      showStatus('Servicio eliminado', 'success');
      const servs = await getServicios();
      setServicios(servs);
    } catch (err) {
      showStatus('Error al eliminar servicio', 'error');
    }
  };

  // Calculate metrics
  const getMetrics = () => {
    const totalToday = turnos.filter(t => t.estado_turno !== 'bloqueado').length;
    const atendidos = turnos.filter(t => t.estado_turno === 'asistio').length;
    const inasistencias = turnos.filter(t => t.estado_turno === 'no_asistio').length;
    
    let ingresos = 0;
    turnos.forEach(t => {
      if (t.estado_turno === 'asistio') {
        ingresos += (t.servicio_precio || 0);
      }
    });

    const rate = totalToday > 0 ? ((inasistencias / totalToday) * 100).toFixed(1) : 0;

    return { totalToday, atendidos, inasistencias, rate, ingresos };
  };

  const metrics = getMetrics();

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeslideup">
      {/* Admin header */}
      <div className="card">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="section-title text-2xl font-bold text-white flex items-center gap-2">
              <span>👑</span> Panel Administrador
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Configuración, métricas y control total</p>
          </div>
          <button onClick={onLogout} className="btn-ghost text-xs">Cerrar Sesión</button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mt-5 border-t border-white/5 pt-4">
          <button 
            onClick={() => setActiveTab('agenda')} 
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${activeTab === 'agenda' ? 'bg-[var(--gold)] text-[#0A0A0A]' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
          >
            📅 Agendas
          </button>
          <button 
            onClick={() => setActiveTab('servicios')} 
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${activeTab === 'servicios' ? 'bg-[var(--gold)] text-[#0A0A0A]' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
          >
            ✂️ Servicios
          </button>
          <button 
            onClick={() => setActiveTab('metricas')} 
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${activeTab === 'metricas' ? 'bg-[var(--gold)] text-[#0A0A0A]' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
          >
            📊 Métricas
          </button>
        </div>
      </div>

      {status && (
        <div className={statusType === 'error' ? 'toast-error animate-shake' : statusType === 'success' ? 'toast-success' : 'toast-info'}>
          {status}
        </div>
      )}

      {/* Tab: Agendas */}
      {activeTab === 'agenda' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="card grid grid-cols-2 gap-4">
            <div>
              <label className="label">Barbero</label>
              <select 
                className="input-dark w-full text-sm" 
                value={selectedBarbero?.id || ''} 
                onChange={e => setSelectedBarbero(barberos.find(b => b.id === Number(e.target.value)))}
              >
                {barberos.map(b => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Fecha</label>
              <input 
                type="date" 
                className="input-dark w-full text-sm" 
                value={fechaAgenda} 
                onChange={e => setFechaAgenda(e.target.value)} 
              />
            </div>
          </div>

          {/* Block General Form */}
          <form onSubmit={handleBlockGeneral} className="card space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>🔒</span> Bloquear Horario General
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label text-[10px]">Fecha</label>
                <input 
                  type="date" 
                  className="input-dark text-xs" 
                  value={blockData.fecha} 
                  onChange={e => setBlockData({...blockData, fecha: e.target.value})} 
                />
              </div>
              <div>
                <label className="label text-[10px]">Hora Inicio</label>
                <input 
                  type="time" 
                  className="input-dark text-xs" 
                  value={blockData.hora_inicio} 
                  onChange={e => setBlockData({...blockData, hora_inicio: e.target.value})} 
                />
              </div>
              <div>
                <label className="label text-[10px]">Hora Fin</label>
                <input 
                  type="time" 
                  className="input-dark text-xs" 
                  value={blockData.hora_fin} 
                  onChange={e => setBlockData({...blockData, hora_fin: e.target.value})} 
                />
              </div>
            </div>
            <button type="submit" className="btn-gold !py-2.5 text-xs">Bloquear para Todos</button>
          </form>

          {/* Turn list for Selected Barber */}
          <div className="space-y-3">
            <label className="label px-1">Turnos de {selectedBarbero?.nombre} el {fechaAgenda}</label>
            {turnos.length === 0 ? (
              <div className="card text-center py-12">
                <span className="text-4xl mb-3 block">📭</span>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay turnos para este día</p>
              </div>
            ) : (
              turnos.map(t => (
                <div key={t.id} className="card relative overflow-hidden flex flex-col md:flex-row justify-between gap-4">
                  {/* Left accent */}
                  <div 
                    className="absolute top-0 left-0 w-1 h-full" 
                    style={{ background: t.estado_turno === 'bloqueado' ? '#EF4444' : 'var(--gold)' }}
                  ></div>

                  <div className="pl-3 space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-white">
                        {t.estado_turno === 'bloqueado' ? '🔒 Descanso / Bloqueado' : t.usuario_nombre}
                      </h4>
                      {t.preferencia === 'puedo_adelantar' && <span className="badge-green text-[10px]">⚡ Flexible</span>}
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="badge-gold">
                        🕒 {new Date(t.hora_inicio.replace(' ', 'T')).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(t.hora_fin.replace(' ', 'T')).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      {t.estado_turno !== 'bloqueado' && (
                        <>
                          <span className="badge-gray">📱 {t.whatsapp}</span>
                          <span className="badge-gray">
                            {t.servicio_icono} {t.servicio_nombre} (${t.servicio_precio})
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:self-center">
                    {t.estado_turno !== 'bloqueado' && (
                      <>
                        <button 
                          onClick={() => handleUpdateStatus(t.id, 'asistio')} 
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${t.estado_turno === 'asistio' ? 'bg-green-500 text-white' : 'bg-white/5 text-green-400 hover:bg-white/10'}`}
                        >
                          ✓ Asistió
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(t.id, 'no_asistio')} 
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${t.estado_turno === 'no_asistio' ? 'bg-red-500 text-white' : 'bg-white/5 text-red-400 hover:bg-white/10'}`}
                        >
                          ✗ Faltó
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => handleDeleteTurno(t.id)} 
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-red-500/20 text-red-500 transition-all duration-200 cursor-pointer"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Servicios */}
      {activeTab === 'servicios' && (
        <div className="space-y-5">
          {/* Services Form */}
          <form onSubmit={handleSaveServicio} className="card space-y-4">
            <h3 className="text-sm font-bold text-white">
              {isEditingService ? '✏️ Editar Servicio' : '➕ Agregar Nuevo Servicio'}
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre</label>
                <input 
                  required type="text" 
                  className="input-dark" 
                  value={serviceForm.nombre} 
                  onChange={e => setServiceForm({...serviceForm, nombre: e.target.value})} 
                  placeholder="Ej: Corte Degradado"
                />
              </div>
              <div>
                <label className="label">Icono (Emoji)</label>
                <select 
                  className="input-dark" 
                  value={serviceForm.icono} 
                  onChange={e => setServiceForm({...serviceForm, icono: e.target.value})}
                >
                  <option value="✂️">✂️ Tijeras</option>
                  <option value="💈">💈 Barber Pole</option>
                  <option value="🧔">🧔 Barba / Hombre</option>
                  <option value="🧼">🧼 Espuma / Lavado</option>
                  <option value="⚡">⚡ Rayo / Fade</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Duración (Minutos)</label>
                <input 
                  required type="number" 
                  className="input-dark" 
                  value={serviceForm.duracion_min} 
                  onChange={e => setServiceForm({...serviceForm, duracion_min: Number(e.target.value)})} 
                  placeholder="45"
                />
              </div>
              <div>
                <label className="label">Precio (COP)</label>
                <input 
                  required type="number" 
                  className="input-dark" 
                  value={serviceForm.precio} 
                  onChange={e => setServiceForm({...serviceForm, precio: Number(e.target.value)})} 
                  placeholder="15000"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn-gold">
                {isEditingService ? 'Actualizar Servicio' : 'Crear Servicio'}
              </button>
              {isEditingService && (
                <button 
                  type="button" 
                  onClick={() => {
                    setServiceForm({ id: null, nombre: '', icono: '✂️', duracion_min: 45, precio: 15000 });
                    setIsEditingService(false);
                  }}
                  className="btn-ghost"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {/* List of services */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {servicios.map(srv => (
              <div key={srv.id} className="card flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-white/5 border border-white/10">
                    {srv.icono}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{srv.nombre}</h4>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {srv.duracion_min} min • ${srv.precio} COP
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEditServiceClick(srv)} 
                    className="p-2 rounded-xl bg-white/5 hover:bg-[var(--gold)] text-white hover:text-black transition-all duration-200 cursor-pointer"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDeleteServiceClick(srv.id)} 
                    className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-red-400 transition-all duration-200 cursor-pointer"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Métricas */}
      {activeTab === 'metricas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center p-5">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Atendidos Hoy</span>
              <span className="text-3xl font-extrabold text-white block mt-2">{metrics.atendidos}</span>
              <span className="text-[10px] text-green-400 block mt-1">✓ Clientes</span>
            </div>
            <div className="card text-center p-5">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Inasistencia</span>
              <span className="text-3xl font-extrabold text-white block mt-2">{metrics.rate}%</span>
              <span className="text-[10px] text-red-400 block mt-1">✗ Faltas</span>
            </div>
            <div className="card text-center p-5">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Ingresos Hoy</span>
              <span className="text-2xl font-extrabold text-[var(--gold)] block mt-2">${metrics.ingresos}</span>
              <span className="text-[10px] text-white/50 block mt-1">Estimado</span>
            </div>
          </div>

          {/* Quick Metrics details */}
          <div className="card space-y-3">
            <h4 className="text-sm font-bold text-white">Resumen de Actividad del Día</h4>
            <div className="space-y-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Total de citas hoy (excluyendo descansos):</span>
                <span className="text-white font-medium">{metrics.totalToday}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Citas completadas con éxito:</span>
                <span className="text-green-400 font-medium">{metrics.atendidos}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span>Citas marcadas como inasistencia (no asistió):</span>
                <span className="text-red-400 font-medium">{metrics.inasistencias}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
