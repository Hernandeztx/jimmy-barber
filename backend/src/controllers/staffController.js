const db = require('../config/db');
const crypto = require('crypto');
const { enviarEmailInvitacion } = require('../services/emailService');
const { enviarMensajeWhatsApp } = require('../services/whatsappService');

// POST /api/staff/invite — Jimmy invita a un nuevo trabajador por email
async function inviteStaff(req, res) {
  const { email, nombre } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'El email es requerido.' });
  }

  try {
    // Check if already invited
    const existing = await db.query(
      'SELECT id, status FROM staff_invites WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0 && existing.rows[0].status === 'active') {
      return res.status(400).json({ error: 'Este trabajador ya está activo en el sistema.' });
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    if (existing.rows.length > 0) {
      // Resend: update token and expiry
      await db.query(
        `UPDATE staff_invites SET token = $1, status = 'pending', expires_at = $2, nombre = $3 WHERE email = $4`,
        [token, expiresAt, nombre || null, email.toLowerCase()]
      );
    } else {
      // New invite
      await db.query(
        `INSERT INTO staff_invites (email, nombre, token, status, expires_at) VALUES ($1, $2, $3, 'pending', $4)`,
        [email.toLowerCase(), nombre || null, token, expiresAt]
      );
    }

    // Send invitation email via Zavu
    const emailResult = await enviarEmailInvitacion(email, token);

    res.json({
      success: true,
      message: `Invitación enviada a ${email}`,
      emailSent: emailResult.success,
    });
  } catch (err) {
    console.error('Error al invitar staff:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// GET /api/staff/validate-token/:token — Trabajador valida su token al llegar al enlace
async function validateToken(req, res) {
  const { token } = req.params;

  try {
    const result = await db.query(
      `SELECT id, email, nombre, status, expires_at FROM staff_invites WHERE token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Token inválido o no encontrado.' });
    }

    const invite = result.rows[0];

    if (invite.status === 'active') {
      return res.status(400).json({ error: 'Este enlace ya fue utilizado. Ya tienes una cuenta activa.' });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Este enlace ha expirado. Pide a Jimmy que te reenvíe la invitación.' });
    }

    res.json({
      valid: true,
      email: invite.email,
      nombre: invite.nombre,
    });
  } catch (err) {
    console.error('Error al validar token:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// POST /api/staff/complete-registration — Trabajador completa su registro
async function completeRegistration(req, res) {
  const { token, nombre, pin, whatsapp } = req.body;

  if (!token || !nombre || !pin) {
    return res.status(400).json({ error: 'Token, nombre y PIN son requeridos.' });
  }

  if (pin.length < 4) {
    return res.status(400).json({ error: 'El PIN debe tener al menos 4 dígitos.' });
  }

  try {
    // Validate token
    const inviteResult = await db.query(
      `SELECT id, email, status, expires_at FROM staff_invites WHERE token = $1`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Token inválido.' });
    }

    const invite = inviteResult.rows[0];

    if (invite.status === 'active') {
      return res.status(400).json({ error: 'Este enlace ya fue usado.' });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'El enlace ha expirado.' });
    }

    // Check PIN is not already in use
    const pinCheck = await db.query('SELECT id FROM barberos WHERE pin = $1', [pin]);
    if (pinCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Ese PIN ya está en uso. Elige otro.' });
    }

    // Create barbero record
    const barberoResult = await db.query(
      `INSERT INTO barberos (nombre, rol, pin, email, whatsapp) VALUES ($1, 'trabajador', $2, $3, $4) RETURNING id, nombre, rol`,
      [nombre, pin, invite.email, whatsapp || null]
    );

    const barbero = barberoResult.rows[0];

    // Mark invite as active
    await db.query(
      `UPDATE staff_invites SET status = 'active', barbero_id = $1 WHERE id = $2`,
      [barbero.id, invite.id]
    );

    // Notify admin via WhatsApp when worker completes registration
    if (whatsapp) {
      const adminRes = await db.query('SELECT whatsapp FROM barberos WHERE rol = \'admin\' LIMIT 1');
      if (adminRes.rows[0]?.whatsapp) {
        const adminWhatsapp = adminRes.rows[0].whatsapp;
        const workerMsg = `🎉 ¡Nuevo trabajador registrado! ${nombre} (${whatsapp}) se unió al equipo de Jimmy Barber.`;
        await enviarMensajeWhatsApp(adminWhatsapp, workerMsg);
      }
    }

    res.json({
      success: true,
      message: '¡Registro completado! Ya puedes iniciar sesión con tu PIN.',
      barbero: {
        id: barbero.id,
        nombre: barbero.nombre,
        rol: barbero.rol,
      },
    });
  } catch (err) {
    console.error('Error al completar registro:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

// GET /api/staff — Jimmy obtiene la lista de staff
async function getStaffList(req, res) {
  try {
    const result = await db.query(`
      SELECT 
        si.id,
        si.email,
        si.nombre,
        si.status,
        si.created_at,
        si.expires_at,
        b.nombre AS nombre_barbero,
        b.rol,
        b.estado
      FROM staff_invites si
      LEFT JOIN barberos b ON b.id = si.barbero_id
      ORDER BY si.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener staff:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = {
  inviteStaff,
  validateToken,
  completeRegistration,
  getStaffList,
};
