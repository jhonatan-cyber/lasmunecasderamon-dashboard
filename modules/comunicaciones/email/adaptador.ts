import { Resend } from 'resend';
import logger from '@/lib/utils/logger';

/**
 * Configuración de Resend para enviar correos electrónicos.
 *
 * Las credenciales provienen de variables de entorno (`RESEND_API_KEY` y
 * `RESEND_FROM_EMAIL`). Si no están configuradas, los envíos fallan
 * silenciosamente y registran el error.
 */

let cachedClient: Resend | null = null;
let cachedFrom: string | null = null;

function getResendClient(): Resend | null {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  cachedClient = new Resend(apiKey);
  return cachedClient;
}

function getFromEmail(): string | null {
  if (cachedFrom !== null) return cachedFrom;

  const from = process.env.RESEND_FROM_EMAIL?.trim();
  cachedFrom = from || null;
  return cachedFrom;
}

/**
 * Envía un correo electrónico usando Resend.
 *
 * Retorna `true` si el correo se envió exitosamente, `false` si no se pudo
 * (credenciales faltantes, error de API, etc.).
 */
export async function enviarEmail({
  to,
  subject,
  html,
  text
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const client = getResendClient();
  if (!client) {
    logger.warn('[Email] No se pudo enviar: RESEND_API_KEY no está configurada');
    return false;
  }

  const from = getFromEmail();
  if (!from) {
    logger.warn('[Email] No se pudo enviar: RESEND_FROM_EMAIL no está configurada');
    return false;
  }

  try {
    if (text) {
      await client.emails.send({
        from: `Las Muñecas de Ramón <${from}>`,
        to: [to],
        subject,
        html,
        text
      });
    } else {
      await client.emails.send({
        from: `Las Muñecas de Ramón <${from}>`,
        to: [to],
        subject,
        html
      });
    }
    return true;
  } catch (err) {
    logger.error('[Email] Error al enviar correo:', { to, err });
    return false;
  }
}

/**
 * Envía el correo de recuperación de contraseña.
 *
 * Genera un HTML simple con la clave temporal y lo envía al correo de
 * recuperación del usuario.
 */
export async function enviarEmailRecuperacionContrasena({
  to,
  passwordTemporal,
  username
}: {
  to: string;
  passwordTemporal: string;
  username?: string;
}): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Recuperación de contraseña</h2>
      <p>Se solicitó la recuperación de contraseña para tu cuenta en <strong>Las Muñecas de Ramón</strong>${
        username ? ` (usuario: <strong>${username}</strong>)` : ''
      }.</p>
      <p>Tu clave temporal es:</p>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
        <code style="font-size: 20px; letter-spacing: 2px; word-break: break-all;">${passwordTemporal}</code>
      </div>
      <p>Ingresa al dashboard con tu usuario habitual y usa esta clave temporal. Deberás cambiarla al iniciar sesión.</p>
      <p style="color: #999; font-size: 12px;">Si no solicitaste esta recuperación, ignora este correo. No compartas esta clave con nadie.</p>
    </div>
  `.trim();

  const text = `
Recuperación de contraseña - Las Muñecas de Ramón

Tu clave temporal es: ${passwordTemporal}

Ingresa al dashboard con tu usuario habitual. Deberás cambiar esta clave al iniciar sesión.
No compartas esta clave con nadie.
  `.trim();

  return enviarEmail({
    to,
    subject: 'Recuperación de contraseña - Las Muñecas de Ramón',
    html,
    text
  });
}

/**
 * Limpia la caché del cliente y el correo emisor.
 * Útil en tests o cuando se actualiza la configuración.
 */
export function clearResendCache() {
  cachedClient = null;
  cachedFrom = null;
}
