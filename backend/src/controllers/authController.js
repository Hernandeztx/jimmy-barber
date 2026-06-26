const db = require('../config/db');
const { enviarMensajeWhatsApp, generarOTP } = require('../services/whatsappService');

// In-memory store for OTPs (In a real app, use Redis or DB with expiration)
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

exports.verifyOTP = (req, res) => {
  const { nombre, email, whatsapp, otp } = req.body;

  if (otpStore[whatsapp] !== otp) {
    return res.status(401).json({ error: 'Código OTP inválido o expirado' });
  }

  // Clear OTP
  delete otpStore[whatsapp];

  // Insert or get user from DB
  let user;
  const selectStmt = db.prepare('SELECT * FROM usuarios WHERE whatsapp = ?');
  user = selectStmt.get(whatsapp);

  if (!user) {
    const insertStmt = db.prepare('INSERT INTO usuarios (nombre, email, whatsapp, verificado) VALUES (?, ?, ?, 1)');
    const info = insertStmt.run(nombre, email || null, whatsapp);
    user = { id: info.lastInsertRowid, nombre, email, whatsapp, verificado: 1 };
  } else if (!user.verificado) {
    const updateStmt = db.prepare('UPDATE usuarios SET verificado = 1 WHERE whatsapp = ?');
    updateStmt.run(whatsapp);
    user.verificado = 1;
  }

  res.json({ message: 'Verificación exitosa', user });
};

exports.loginBarber = (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ error: 'PIN requerido' });
  }

  try {
    const selectStmt = db.prepare('SELECT * FROM barberos WHERE pin = ?');
    const barbero = selectStmt.get(pin);

    if (!barbero) {
      return res.status(401).json({ error: 'PIN incorrecto' });
    }

    res.json({ message: 'Login exitoso', barbero });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
