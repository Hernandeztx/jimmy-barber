const Zavu = require('@zavudev/sdk').default || require('@zavudev/sdk');

// Default API Key provided by user (will use process.env.ZAVU_API_KEY if defined in production)
const apiKey = process.env.ZAVU_API_KEY || 'zv_test_9f1c64462d87c68c76a1f4bd1fb7e95f7491fd9788fba732';

let zavu = null;
try {
  zavu = new Zavu({ apiKey });
} catch (err) {
  console.error('Error al inicializar Zavu SDK:', err);
}

async function enviarMensajeWhatsApp(numero, texto) {
  // Asegurarse de que tenga el formato de número correcto (+57... para Colombia)
  let numDestino = numero.trim().replace(/[^\d+]/g, '');
  if (!numDestino.startsWith('+')) {
    if (numDestino.startsWith('57')) {
      numDestino = '+' + numDestino;
    } else if (numDestino.length === 10) {
      numDestino = '+57' + numDestino;
    } else {
      numDestino = '+' + numDestino;
    }
  }

  const timestamp = new Date().toISOString();
  console.log(`\n======================================================`);
  console.log(`[ENVÍO WHATSAPP ZAVU] - ${timestamp}`);
  console.log(`DESTINATARIO : ${numDestino}`);
  console.log(`MENSAJE      :\n${texto}`);
  console.log(`======================================================\n`);

  if (zavu) {
    try {
      await zavu.messages.send({ to: numDestino, text: texto });
      return { success: true, message: 'Mensaje enviado con éxito vía Zavu' };
    } catch (err) {
      console.error('Error al enviar mensaje a través de Zavu:', err.message);
      return { success: false, error: err.message };
    }
  }

  return { success: true, message: 'Zavu no inicializado, mensaje simulado' };
}

function generarOTP() {
  // Genera un código aleatorio de 4 dígitos
  return Math.floor(1000 + Math.random() * 9000).toString();
}

module.exports = {
  enviarMensajeWhatsApp,
  generarOTP
};
