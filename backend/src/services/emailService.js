const Zavu = require('@zavudev/sdk').default || require('@zavudev/sdk');

const apiKey = process.env.ZAVU_API_KEY || 'zv_test_9f1c64462d87c68c76a1f4bd1fb7e95f7491fd9788fba732';
const FROM_EMAIL = process.env.ZAVU_FROM_EMAIL || 'noreply@sandbox-mail-cxnz5m61.zavu.lat';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://produccion-jimmyfrontend.kc7r3m.easypanel.host';

let zavu = null;
try {
  zavu = new Zavu({ apiKey });
} catch (err) {
  console.error('Error al inicializar Zavu SDK para email:', err);
}

async function enviarEmailInvitacion(emailDestino, token, nombreBarberia = 'Jimmy Barber') {
  const enlaceRegistro = `${FRONTEND_URL}/register?token=${token}`;

  const asunto = `✂️ Invitación para unirte al equipo de ${nombreBarberia}`;
  const cuerpo = `
¡Hola!

Has sido invitado a unirte al equipo de trabajo de ${nombreBarberia}.

Para completar tu registro, haz clic en el siguiente enlace:

${enlaceRegistro}

Este enlace es válido por 7 días.

Si no esperabas este mensaje, puedes ignorarlo.

Saludos,
El equipo de ${nombreBarberia}
  `.trim();

  const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación - ${nombreBarberia}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;max-width:600px;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#c8a96e,#f0d48a);padding:32px;text-align:center;">
              <div style="font-size:40px;margin-bottom:8px;">💈</div>
              <h1 style="color:#0a0a0a;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">${nombreBarberia}</h1>
              <p style="color:#3d3000;margin:4px 0 0;font-size:14px;">Sistema de Gestión de Turnos</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="color:#f0d48a;margin:0 0 16px;font-size:22px;">¡Has sido invitado al equipo! 🎉</h2>
              <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Alguien del equipo de <strong style="color:#fff;">${nombreBarberia}</strong> te ha enviado una invitación para unirte a la plataforma de gestión de turnos.
              </p>
              <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 32px;">
                Haz clic en el botón a continuación para completar tu registro y configurar tu cuenta:
              </p>
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${enlaceRegistro}" 
                       style="display:inline-block;background:linear-gradient(135deg,#c8a96e,#f0d48a);color:#0a0a0a;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.3px;">
                      ✅ Completar mi Registro
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Info box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
                <tr>
                  <td style="background-color:#0a0a0a;border:1px solid #2a2a2a;border-radius:10px;padding:16px;">
                    <p style="color:#666;font-size:13px;margin:0 0 8px;">🔗 Si el botón no funciona, copia este enlace:</p>
                    <p style="color:#c8a96e;font-size:12px;margin:0;word-break:break-all;">${enlaceRegistro}</p>
                  </td>
                </tr>
              </table>
              <p style="color:#555;font-size:12px;margin:24px 0 0;text-align:center;">
                ⏰ Este enlace expira en 7 días. Si no esperabas esta invitación, ignora este mensaje.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#111;border-top:1px solid #2a2a2a;padding:20px 32px;text-align:center;">
              <p style="color:#444;font-size:12px;margin:0;">© 2026 ${nombreBarberia}. Sistema de turnos.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  console.log(`\n[EMAIL ZAVU] Enviando invitación a: ${emailDestino}`);
  console.log(`[EMAIL ZAVU] Enlace: ${enlaceRegistro}`);

  if (zavu) {
    try {
      await zavu.messages.send({
        to: emailDestino,
        from: FROM_EMAIL,
        channel: 'email',
        subject: asunto,
        text: cuerpo,
        html: htmlBody,
      });
      console.log(`[EMAIL ZAVU] ✅ Enviado exitosamente a ${emailDestino}`);
      return { success: true };
    } catch (err) {
      console.error('[EMAIL ZAVU] ❌ Error al enviar:', err.message);
      return { success: false, error: err.message };
    }
  }

  return { success: true, message: 'Zavu no inicializado, email simulado' };
}

module.exports = { enviarEmailInvitacion };
