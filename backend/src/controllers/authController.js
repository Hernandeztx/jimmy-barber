const db = require('../config/db');
const { enviarMensajeWhatsApp, generarOTP } = require('../services/whatsappService');

// In-memory store for OTPs
const otpStore = {};

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

  // Clear OTP
  delete otpStore[whatsapp];

  try {
    // Insert or get user from DB
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

    res.json({ message: 'Login exitoso', barbero });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
