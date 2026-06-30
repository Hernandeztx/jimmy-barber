const db = require('../config/db');
const { enviarMensajeWhatsApp, generarOTP } = require('../services/whatsappService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');

const JWT_SECRET = process.env.JWT_SECRET || 'barber-turn-secret-key';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

const client = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token requerido' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

exports.googleLogin = async (req, res) => {
  const { id_token, email, nombre, picture } = req.body;
  
  // Demo mode: si no hay id_token, usar email/nombre
  if (!id_token) {
    try {
      if (!email) return res.status(400).json({ error: 'Email es requerido' });
      
      let user;
      const selectRes = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
      user = selectRes.rows[0];

      if (!user) {
        const insertRes = await db.query(
          'INSERT INTO usuarios (nombre, email, whatsapp, verificado, picture) VALUES ($1, $2, $3, 1, $4) RETURNING *',
          [nombre, email, null, picture || null]
        );
        user = insertRes.rows[0];
      }

      const token = jwt.sign(
        { id: user.id, nombre: user.nombre, email: user.email, whatsapp: user.whatsapp, isStaff: false },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({ message: 'Login con Google exitoso', user, token, needsPhone: !user.whatsapp });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // OAuth real con id_token
  try {
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;
    
    if (!email) {
      return res.status(400).json({ error: 'Email no disponible en el token de Google' });
    }

    let user;
    const selectRes = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    user = selectRes.rows[0];

    if (!user) {
      const insertRes = await db.query(
        'INSERT INTO usuarios (nombre, email, whatsapp, verificado, picture) VALUES ($1, $2, $3, 1, $4) RETURNING *',
        [name, email, null, picture || null]
      );
      user = insertRes.rows[0];
    }

    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, email: user.email, whatsapp: user.whatsapp, isStaff: false },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ message: 'Login con Google exitoso', user, token, needsPhone: !user.whatsapp });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Token de Google inválido' });
  }
};

exports.staffLogin = async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  try {
    const selectRes = await db.query('SELECT * FROM barberos WHERE email = $1', [email]);
    const barbero = selectRes.rows[0];

    if (!barbero) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const inviteCheck = await db.query(
      'SELECT status FROM staff_invites WHERE barbero_id = $1',
      [barbero.id]
    );

    if (inviteCheck.rows.length > 0 && inviteCheck.rows[0].status !== 'active') {
      return res.status(403).json({ error: 'Tu cuenta aún no está activa. Completa el registro desde el enlace de invitación.' });
    }

    if (barbero.password) {
      const validPassword = await bcrypt.compare(password, barbero.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Credenciales incorrectas' });
      }
    } else {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: barbero.id, nombre: barbero.nombre, rol: barbero.rol, email: barbero.email, isStaff: true },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ message: 'Login exitoso', barbero, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.requestOTP = async (req, res) => {
  const { nombre, email, whatsapp } = req.body;
  if (!nombre || !whatsapp) {
    return res.status(400).json({ error: 'Nombre y WhatsApp son requeridos' });
  }

  const otp = generarOTP();
  otpStore[whatsapp] = otp;

  const texto = `Hola ${nombre}, tu código de verificación para Jimmy Barber es: *${otp}*. Válido por 5 minutos.`;
  await enviarMensajeWhatsApp(whatsapp, texto);

  res.json({ message: 'OTP generado y enviado por WhatsApp simulado' });
};

exports.verifyOTP = async (req, res) => {
  const { nombre, email, whatsapp, otp } = req.body;

  if (otpStore[whatsapp] !== otp) {
    return res.status(401).json({ error: 'Código OTP inválido o expirado' });
  }

  delete otpStore[whatsapp];

  try {
    let user;
    const selectRes = await db.query('SELECT * FROM usuarios WHERE whatsapp = $1', [whatsapp]);
    user = selectRes.rows[0];

    if (!user) {
      const insertRes = await db.query(
        'INSERT INTO usuarios (nombre, email, whatsapp, verificado) VALUES ($1, $2, $3, 1) RETURNING *',
        [nombre, email || null, whatsapp]
      );
      user = insertRes.rows[0];
    } else if (!user.verificado) {
      const updateRes = await db.query(
        'UPDATE usuarios SET verificado = 1 WHERE whatsapp = $1 RETURNING *',
        [whatsapp]
      );
      user = updateRes.rows[0];
    }

    res.json({ message: 'Verificación exitosa', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.loginBarber = async (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ error: 'PIN requerido' });
  }

  try {
    const selectRes = await db.query('SELECT * FROM barberos WHERE pin = $1', [pin]);
    const barbero = selectRes.rows[0];

    if (!barbero) {
      return res.status(401).json({ error: 'PIN incorrecto' });
    }

    const inviteCheck = await db.query(
      'SELECT status FROM staff_invites WHERE barbero_id = $1',
      [barbero.id]
    );

    if (inviteCheck.rows.length > 0 && inviteCheck.rows[0].status !== 'active') {
      return res.status(403).json({ error: 'Tu cuenta aún no está activa. Completa el registro desde el enlace de invitación.' });
    }

    const token = jwt.sign(
      { id: barbero.id, nombre: barbero.nombre, rol: barbero.rol, email: barbero.email, isStaff: true },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ message: 'Login exitoso', barbero, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.completeProfile = async (req, res) => {
  const { userId, phone_number } = req.body;
  
  if (!userId || !phone_number) {
    return res.status(400).json({ error: 'userId y phone_number son requeridos' });
  }

  try {
    const updateRes = await db.query(
      'UPDATE usuarios SET whatsapp = $1 WHERE id = $2 RETURNING *',
      [phone_number, userId]
    );

    const user = updateRes.rows[0];
    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, email: user.email, whatsapp: user.whatsapp },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ message: 'Perfil completado', user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.googleAuth = async (req, res) => {
  const redirectUri = `${process.env.BACKEND_URL || 'https://produccion-jimmybackend.kc7r3m.easypanel.host'}/api/auth/google/callback`;
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    redirect_uri: redirectUri
  });
  res.redirect(authUrl);
};

exports.googleAuthCallback = async (req, res) => {
  try {
    const redirectUri = `${process.env.BACKEND_URL || 'https://produccion-jimmybackend.kc7r3m.easypanel.host'}/api/auth/google/callback`;
    const { tokens } = await client.getToken({
      code: req.query.code,
      redirect_uri: redirectUri
    });

    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user;
    const selectRes = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    user = selectRes.rows[0];

    if (!user) {
      const insertRes = await db.query(
        'INSERT INTO usuarios (nombre, email, whatsapp, verificado, picture) VALUES ($1, $2, $3, 1, $4) RETURNING *',
        [name, email, null, picture || null]
      );
      user = insertRes.rows[0];
    }

    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, email: user.email, whatsapp: user.whatsapp, isStaff: false },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const frontendUrl = process.env.FRONTEND_URL || 'https://produccion-jimmyfrontend.kc7r3m.easypanel.host';
    const needsPhone = !user.whatsapp;
    res.redirect(`${frontendUrl}/complete-profile?token=${token}&needsPhone=${needsPhone}&user=${encodeURIComponent(JSON.stringify(user))}`);
  } catch (err) {
    console.error('Google callback error:', err);
    res.redirect(`${process.env.FRONTEND_URL || 'https://produccion-jimmyfrontend.kc7r3m.easypanel.host'}/?error=google_auth_failed`);
  }
};

exports.verifyAuthToken = verifyToken;

const otpStore = {};