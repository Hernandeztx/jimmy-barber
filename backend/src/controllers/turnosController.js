const db = require('../config/db');
const { enviarMensajeWhatsApp } = require('../services/whatsappService');

// In-memory store for timers
const timers = {};
const cascades = {};

exports.crearTurno = (req, res) => {
  const { barbero_id, usuario_id, servicio_id, hora_inicio, hora_fin, preferencia } = req.body;

  if (!barbero_id || !usuario_id || !servicio_id || !hora_inicio || !hora_fin) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO turnos (barbero_id, usuario_id, servicio_id, hora_inicio, hora_fin, preferencia, estado_turno)
      VALUES (?, ?, ?, ?, ?, ?, 'pendiente')
    `);
    const info = stmt.run(barbero_id, usuario_id, servicio_id, hora_inicio, hora_fin, preferencia || 'hora_fija');
    
    // Fetch details for WhatsApp confirmation
    const barbero = db.prepare('SELECT nombre FROM barberos WHERE id = ?').get(barbero_id);
    const servicio = db.prepare('SELECT nombre, precio, icono FROM servicios WHERE id = ?').get(servicio_id);
    const usuario = db.prepare('SELECT nombre, whatsapp FROM usuarios WHERE id = ?').get(usuario_id);

    if (usuario && barbero && servicio) {
      const [fecha, hora] = hora_inicio.split(' ');
      const msg = `✅ Tu turno en Jimmy Barber está confirmado para el ${fecha} a las ${hora} con ${barbero.nombre}. Servicio: ${servicio.icono} ${servicio.nombre} ($${servicio.precio}). Recuerda estar pendiente a tu celular 20 minutos antes por si hay un turno disponible antes. — Jimmy Barber 💈`;
      enviarMensajeWhatsApp(usuario.whatsapp, msg);
    }

    res.status(201).json({ message: 'Turno creado', turnoId: info.lastInsertRowid });
  } catch (error) {
    if (error.message.includes('ya tiene un turno pendiente')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error al crear turno', details: error.message });
  }
};

exports.getTurnosBarbero = (req, res) => {
  const { barberoId } = req.params;
  const { date } = req.query; // Format: YYYY-MM-DD

  let query = `
    SELECT t.*, u.nombre as usuario_nombre, u.whatsapp, 
           s.nombre as servicio_nombre, s.icono as servicio_icono, s.precio as servicio_precio
    FROM turnos t
    LEFT JOIN usuarios u ON t.usuario_id = u.id
    LEFT JOIN servicios s ON t.servicio_id = s.id
    WHERE t.barbero_id = ?
  `;
  const params = [barberoId];

  if (date) {
    query += ` AND date(t.hora_inicio) = ?`;
    params.push(date);
  }

  query += ` ORDER BY t.hora_inicio ASC`;

  try {
    const stmt = db.prepare(query);
    const turnos = stmt.all(...params);
    res.json(turnos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener turnos', details: error.message });
  }
};

exports.bloquearHorario = (req, res) => {
  const { barberoId } = req.params;
  const { hora_inicio, hora_fin } = req.body;

  if (!hora_inicio || !hora_fin) {
    return res.status(400).json({ error: 'hora_inicio y hora_fin son requeridas' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO turnos (barbero_id, usuario_id, servicio_id, hora_inicio, hora_fin, preferencia, estado_turno)
      VALUES (?, NULL, NULL, ?, ?, 'hora_fija', 'bloqueado')
    `);
    const info = stmt.run(barberoId, hora_inicio, hora_fin);
    res.status(201).json({ message: 'Horario bloqueado', turnoId: info.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Error al bloquear horario', details: error.message });
  }
};

exports.actualizarEstadoTurno = (req, res) => {
  const { turnoId } = req.params;
  const { estado_turno } = req.body;

  if (!estado_turno) {
    return res.status(400).json({ error: 'estado_turno es requerido' });
  }

  try {
    const stmt = db.prepare('UPDATE turnos SET estado_turno = ? WHERE id = ?');
    const info = stmt.run(estado_turno, turnoId);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }
    res.json({ message: 'Estado del turno actualizado', turnoId, estado_turno });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar turno', details: error.message });
  }
};

exports.eliminarTurno = (req, res) => {
  const { turnoId } = req.params;

  try {
    const stmt = db.prepare('DELETE FROM turnos WHERE id = ?');
    const info = stmt.run(turnoId);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }
    res.json({ message: 'Turno/Horario eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar', details: error.message });
  }
};

exports.avisarSiguiente = (req, res) => {
  const { turnoId } = req.params;
  
  const stmt = db.prepare(`
    SELECT t.*, u.nombre, u.whatsapp 
    FROM turnos t 
    JOIN usuarios u ON t.usuario_id = u.id 
    WHERE t.id = ?
  `);
  const turno = stmt.get(turnoId);

  if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });

  const texto = `Hola ${turno.nombre}, es tu turno en la barbería. Por favor, acércate a la silla. Tienes 5 minutos para responder o presentarte.`;
  enviarMensajeWhatsApp(turno.whatsapp, texto);

  if (timers[turnoId]) clearTimeout(timers[turnoId]);
  
  timers[turnoId] = setTimeout(() => {
    console.log(`[ALERTA VOZ] - El cliente ${turno.nombre} no respondió al turno ${turnoId}. Llamando al siguiente.`);
  }, 5000); // 5 SEGUNDOS PARA TEST RÁPIDO

  res.json({ message: 'Aviso enviado y temporizador iniciado', turno });
};

exports.retrasarAgenda = (req, res) => {
  const { barberoId } = req.params;
  const { minutos, desdeHora } = req.body; 

  if (!minutos || !desdeHora) {
    return res.status(400).json({ error: 'Minutos y desdeHora son requeridos' });
  }

  const selectStmt = db.prepare(`
    SELECT t.*, u.whatsapp, u.nombre
    FROM turnos t
    JOIN usuarios u ON t.usuario_id = u.id
    WHERE t.barbero_id = ? AND t.hora_inicio >= ? AND t.estado_turno = 'pendiente'
  `);
  const turnosAfectados = selectStmt.all(barberoId, desdeHora);

  const updateStmt = db.prepare(`
    UPDATE turnos 
    SET hora_inicio = datetime(hora_inicio, '+' || ? || ' minutes'),
        hora_fin = datetime(hora_fin, '+' || ? || ' minutes')
    WHERE id = ?
  `);

  const tx = db.transaction((turnos, min) => {
    for (const turno of turnos) {
      updateStmt.run(min, min, turno.id);
      const texto = `Hola ${turno.nombre}, tu turno ha sido retrasado ${min} minutos. Lamentamos el inconveniente.`;
      enviarMensajeWhatsApp(turno.whatsapp, texto);
    }
  });

  tx(turnosAfectados, minutos);

  res.json({ message: `Agenda retrasada ${minutos} minutos para ${turnosAfectados.length} turnos.`, afectados: turnosAfectados.length });
};

exports.invitarAdelantar = (req, res) => {
  const { barberoId } = req.params;
  const { fecha } = req.body;

  if (!fecha) {
    return res.status(400).json({ error: 'fecha es requerida (YYYY-MM-DD)' });
  }

  const stmt = db.prepare(`
    SELECT t.*, u.nombre, u.whatsapp
    FROM turnos t
    JOIN usuarios u ON t.usuario_id = u.id
    WHERE t.barbero_id = ?
      AND date(t.hora_inicio) = ?
      AND t.preferencia = 'puedo_adelantar'
      AND t.estado_turno = 'pendiente'
    ORDER BY t.hora_inicio ASC
  `);
  const turnosFlexibles = stmt.all(barberoId, fecha);

  if (turnosFlexibles.length === 0) {
    return res.json({ message: 'No hay clientes flexibles pendientes para hoy.', count: 0 });
  }

  if (cascades[barberoId]) {
    clearTimeout(cascades[barberoId].timer);
    delete cascades[barberoId];
  }

  cascades[barberoId] = {
    turnos: turnosFlexibles,
    currentIndex: 0,
    timer: null
  };

  enviarSiguienteInvitacion(barberoId);

  res.json({ message: 'Invitaciones en cascada de adelanto iniciadas', count: turnosFlexibles.length });
};

function enviarSiguienteInvitacion(barberoId) {
  const cascade = cascades[barberoId];
  if (!cascade || cascade.currentIndex >= cascade.turnos.length) {
    delete cascades[barberoId];
    return;
  }

  const turno = cascade.turnos[cascade.currentIndex];
  const texto = `Hola ${turno.nombre}, se liberó un espacio más temprano hoy con tu barbero en Jimmy Barber. ¿Te gustaría adelantar tu cita? Confírmanos respondiendo.`;
  enviarMensajeWhatsApp(turno.whatsapp, texto);

  console.log(`[CASCADA ADELANTO] Enviando invitación a ${turno.nombre} (${turno.whatsapp})`);

  cascade.timer = setTimeout(() => {
    // Check if appointment is still pending (meaning they didn't accept or reschedule yet)
    const currentTurno = db.prepare('SELECT estado_turno FROM turnos WHERE id = ?').get(turno.id);
    if (currentTurno && currentTurno.estado_turno === 'pendiente') {
      console.log(`[CASCADA ADELANTO] Cliente ${turno.nombre} no respondió en 5s. Pasando al siguiente.`);
      cascade.currentIndex++;
      enviarSiguienteInvitacion(barberoId);
    }
  }, 5000); // 5 SEGUNDOS PARA MODO TEST RÁPIDO
}
