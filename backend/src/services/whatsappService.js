/**
 * Servicio Simulado de WhatsApp
 * Este módulo sirve como "mock" para imprimir en consola los mensajes que se enviarían por WhatsApp.
 * En el futuro, se puede integrar aquí la lógica para Evolution API o Baileys.
 */

function enviarMensajeWhatsApp(numero, texto) {
  // Asegurarse de que tenga el código de país (asumiendo Colombia +57 si tiene 10 dígitos)
  let numDestino = numero;
  if (numDestino.length === 10) numDestino = '57' + numDestino;

  const timestamp = new Date().toISOString();
  console.log(`\n======================================================`);
  console.log(`[SIMULACIÓN WA] - ${timestamp}`);
  console.log(`DESTINATARIO : ${numDestino}`);
  console.log(`MENSAJE      :\n${texto}`);
  console.log(`======================================================\n`);
  
  // Aquí es donde harías un fetch a la Evolution API en el futuro
  // return fetch('http://localhost:8080/message/sendText', { ... });
  
  return Promise.resolve({ success: true, message: 'Mensaje simulado enviado' });
}

function generarOTP() {
  // Genera un código aleatorio de 4 dígitos
  return Math.floor(1000 + Math.random() * 9000).toString();
}

module.exports = {
  enviarMensajeWhatsApp,
  generarOTP
};
