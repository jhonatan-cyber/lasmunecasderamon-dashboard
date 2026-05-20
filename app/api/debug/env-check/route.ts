import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? '✅ configurada' : '❌ NO configurada',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? '✅ configurada' : '❌ NO configurada',
    TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER || '❌ NO configurada',
    ADMIN_WHATSAPP_NUMBER: process.env.ADMIN_WHATSAPP_NUMBER || '❌ NO configurada',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || '❌ NO configurada',
    NODE_ENV: process.env.NODE_ENV || 'unknown'
  };

  const allConfigured =
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_NUMBER &&
    process.env.ADMIN_WHATSAPP_NUMBER;

  return NextResponse.json({
    status: allConfigured ? 'ok' : 'missing_config',
    env: envVars,
    hint: allConfigured
      ? 'Todas las variables están configuradas. Si WhatsApp no funciona, revisa los logs de PM2.'
      : 'Faltan variables de entorno. Configúralas en GitHub Secrets o en el .env del servidor.'
  });
}
