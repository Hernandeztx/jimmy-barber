const db = require('../config/db');
const { enviarMensajeWhatsApp } = require('../services/whatsappService');

// In-memory store for timers and active cascade invites
const timers = {};
const cascades = {};

exports.crearTurno = async (req, res) => {
  const { barbero_id, usuario_id, servicio_id, hora_inicio, hora_fin, preferencia } = req.body;

  if (!barbero_id || !usuario_id || !servicio_id || !hora_inicio || !hora_fin) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const insertRes = await db.query(`
      INSERT INTO turnos (barbero_id, usuario_id, servicio_id, hora_inicio, hora_fin, preferencia, estado_turno)
      VALUES ($1, $2, $3, $4::timestamp, $5::timestamp, $6, 'pendiente')
      RETURNING id
    `, [barbero_id, usuario_id, servicio_id, hora_inicio, hora_fin, preferencia || 'hora_fija']);
    
    const turnoId = insertRes.rows[0].id;

    // Fetch details for WhatsApp confirmation
    const barberoRes = await db.query('SELECT nombre FROM barberos WHERE id = $1', [barbero_id]);
    const servicioRes = await db.query('SELECT nombre, precio, icono FROM servicios WHERE id = $1', [servicio_id]);
    const usuarioRes = await db.query('SELECT nombre, whatsapp FROM usuarios WHERE id = $1', [usuario_id]);

    const barbero = barberoRes.rows[0];
    const servicio = servicioRes.rows[0];
    const usuario = usuarioRes.rows[0];

    if (usuario && barbero && servicio) {
      const [fecha, hora] = hora_inicio.split(' ');
      const msg = `✅ Tu turno en Jimmy Barber está confirmado para el ${fecha} a las ${hora} con ${barbero.nombre}. Servicio: ${servicio.icono} ${servicio.nombre} ($${Math.round(servicio.precio)}). Recuerda estar pendiente a tu celular 20 minutos antes por si hay un turno disponible antes. — Jimmy Barber 💈`;
      await enviarMensajeWhatsApp(usuario.whatsapp, msg);
    }

    res.status(201).json({ message: 'Turno creado', turnoId });
  } catch (error) {
    if (error.message.includes('ya tiene un turno pendiente') || error.message.includes('ya tiene un turno')) {
      return res.status(400).json({ error: 'El usuario ya tiene un turno pendiente para este día.' });
    }
    res.status(500).json({ error: 'Error al crear turno', details: error.message });
  }
};

exports.getTurnosBarbero = async (req, res) => {
  const { barberoId } = req.params;
  const { date } = req.query; // Format: YYYY-MM-DD

  let query = `
    SELECT t.id, t.barbero_id, t.usuario_id, t.servicio_id, t.preferencia, t.estado_turno,
           to_char(t.hora_inicio, 'YYYY-MM-DD HH24:MI') as hora_inicio,
           to_char(t.hora_fin, 'YYYY-MM-DD HH24:MI') as hora_fin,
           u.nombre as usuario_nombre, u.whatsapp, 
           s.nombre as servicio_nombre, s.icono as servicio_icono, s.precio as servicio_precio
    FROM turnos t
    LEFT JOIN usuarios u ON t.usuario_id = u.id
    LEFT JOIN servicios s ON t.servicio_id = s.id
    WHERE t.barbero_id = $1
  `;
  const params = [barberoId];

  if (date) {
    query += ` AND t.hora_inicio::date = $2::date`;
    params.push(date);
  }

  query += ` ORDER BY t.hora_inicio ASC`;

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener turnos', details: error.message });
  }
};

exports.bloquearHorario = async (req, res) => {
  const { barberoId } = req.params;
  const { hora_inicio, hora_fin } = req.body;

  if (!hora_inicio || !hora_fin) {
    return res.status(400).json({ error: 'hora_inicio y hora_fin son requeridas' });
  }

  try {
    const result = await db.query(`
      INSERT INTO turnos (barbero_id, usuario_id, servicio_id, hora_inicio, hora_fin, preferencia, estado_turno)
      VALUES ($1, NULL, NULL, $2::timestamp, $3::timestamp, 'hora_fija', 'bloqueado')
      RETURNING id
    `, [barberoId, hora_inicio, hora_fin]);
    
    res.status(201).json({ message: 'Horario bloqueado', turnoId: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Error al bloquear horario', details: error.message });
  }
};

exports.actualizarEstadoTurno = async (req, res) => {
  const { turnoId } = req.params;
  const { estado_turno } = req.body;

  if (!estado_turno) {
    return res.status(400).json({ error: 'estado_turno es requerido' });
  }

  try {
    const result = await db.query('UPDATE turnos SET estado_turno = $1 WHERE id = $2', [estado_turno, turnoId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }
    res.json({ message: 'Estado del turno actualizado', turnoId, estado_turno });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar turno', details: error.message });
  }
};

exports.eliminarTurno = async (req, res) => {
  const { turnoId } = req.params;

  try {
    const result = await db.query('DELETE FROM turnos WHERE id = $1', [turnoId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }
    res.json({ message: 'Turno/Horario eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar', details: error.message });
  }
};

exports.avisarSiguiente = async (req, res) => {
  const { turnoId } = req.params;
  
  try {
    const result = await db.query(`
      SELECT t.*, u.nombre, u.whatsapp 
      FROM turnos t 
      JOIN usuarios u ON t.usuario_id = u.id 
      WHERE t.id = $1
    `, [turnoId]);
    
    const turno = result.rows[0];

    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });

    const texto = `Hola ${turno.nombre}, es tu turno en la barbería. Por favor, acércate a la silla. Tienes 5 minutos para responder o presentarte.`;
    await enviarMensajeWhatsApp(turno.whatsapp, texto);

    if (timers[turnoId]) clearTimeout(timers[turnoId]);
    
    timers[turnoId] = setTimeout(() => {
      console.log(`[ALERTA VOZ] - El cliente ${turno.nombre} no respondió al turno ${turnoId}. Llamando al siguiente.`);
    }, 5000); // 5 SEGUNDOS PARA TEST RÁPIDO

    res.json({ message: 'Aviso enviado y temporizador iniciado', turno });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.retrasarAgenda = async (req, res) => {
  const { barberoId } = req.params;
  const { minutos, desdeHora } = req.body; 

  if (!minutos || !desdeHora) {
    return res.status(400).json({ error: 'Minutos y desdeHora son requeridos' });
  }

  try {
    const selectRes = await db.query(`
      SELECT t.id, to_char(t.hora_inicio, 'YYYY-MM-DD HH24:MI') as hora_inicio, u.whatsapp, u.nombre
      FROM turnos t
      JOIN usuarios u ON t.usuario_id = u.id
      WHERE t.barbero_id = $1 AND t.hora_inicio >= $2::timestamp AND t.estado_turno = 'pendiente'
    `, [barberoId, desdeHora]);
    
    const turnosAfectados = selectRes.rows;

    // Execute in a PostgreSQL transaction for safety
    await db.query('BEGIN');
    
    for (const turno of turnosAfectados) {
      await db.query(`
        UPDATE turnos 
        SET hora_inicio = hora_inicio + ($1 || ' minutes')::interval,
            hora_fin = hora_fin + ($1 || ' minutes')::interval
        WHERE id = $2
      `, [minutos, turno.id]);
      
      const texto = `Hola ${turno.nombre}, tu turno ha sido retrasado ${minutos} minutos. Lamentamos el inconveniente.`;
      await enviarMensajeWhatsApp(turno.whatsapp, texto);
    }

    await db.query('COMMIT');

    res.json({ message: `Agenda retrasada ${minutos} minutos para ${turnosAfectados.length} turnos.`, afectados: turnosAfectados.length });
  } catch (error) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: 'Error al retrasar la agenda', details: error.message });
  }
};

exports.invitarAdelantar = async (req, res) => {
  const { barberoId } = req.params;
  const { fecha } = req.body;

  if (!fecha) {
    return res.status(400).json({ error: 'fecha es requerida (YYYY-MM-DD)' });
  }

  try {
    const result = await db.query(`
      SELECT t.id, to_char(t.hora_inicio, 'YYYY-MM-DD HH24:MI') as hora_inicio, u.nombre, u.whatsapp
      FROM turnos t
      JOIN usuarios u ON t.usuario_id = u.id
      WHERE t.barbero_id = $1
        AND t.hora_inicio::date = $2::date
        AND t.preferencia = 'puedo_adelantar'
        AND t.estado_turno = 'pendiente'
      ORDER BY t.hora_inicio ASC
    `, [barberoId, fecha]);

    const turnosFlexibles = result.rows;

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

    await enviarSiguienteInvitacion(barberoId);

    res.json({ message: 'Invitaciones en cascada de adelanto iniciadas', count: turnosFlexibles.length });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar invitaciones en cascada', details: error.message });
  }
};

async function enviarSiguienteInvitacion(barberoId) {
  const cascade = cascades[barberoId];
  if (!cascade || cascade.currentIndex >= cascade.turnos.length) {
    delete cascades[barberoId];
    return;
  }

  const turno = cascade.turnos[cascade.currentIndex];
  const texto = `Hola ${turno.nombre}, se liberó un espacio más temprano hoy con tu barbero en Jimmy Barber. ¿Te gustaría adelantar tu cita? Confírmanos respondiendo.`;
  await enviarMensajeWhatsApp(turno.whatsapp, texto);

  console.log(`[CASCADA ADELANTO] Enviando invitación a ${turno.nombre} (${turno.whatsapp})`);

  cascade.timer = setTimeout(async () => {
    try {
      // Check if appointment is still pending (meaning they didn't accept or reschedule yet)
      const res = await db.query('SELECT estado_turno FROM turnos WHERE id = $1', [turno.id]);
      const currentTurno = res.rows[0];
      if (currentTurno && currentTurno.estado_turno === 'pendiente') {
        console.log(`[CASCADA ADELANTO] Cliente ${turno.nombre} no respondió en 5s. Pasando al siguiente.`);
        cascade.currentIndex++;
        await enviarSiguienteInvitacion(barberoId);
      }
    } catch (err) {
      console.error('Error checking cascade state:', err);
    }
  }, 5000); // 5 SEGUNDOS PARA MODO TEST RÁPIDO
}
