import twilio from 'twilio';
import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CLAVES = [
  'twilio_account_sid',
  'twilio_auth_token',
  'twilio_whatsapp_number',
  'admin_whatsapp'
] as const;

const limpiar = (valor: string | undefined | null) => (valor || '').trim();

/**
 * Misma regla que en runtime (lib/business/twilioConfig.ts): la base manda y el
 * `.env` entra cuando el campo está vacío o la base no responde.
 */
async function leerConfig() {
  let db: Record<string, string> = {};
  try {
    const client = new Client({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    await client.connect();
    try {
      const { rows } = await client.query(
        'SELECT clave, valor FROM configuraciones WHERE clave = ANY($1)',
        [[...CLAVES]]
      );
      db = Object.fromEntries(rows.map(row => [row.clave as string, limpiar(row.valor as string)]));
    } finally {
      await client.end();
    }
  } catch (error) {
    console.warn(
      `⚠️  No se pudo leer configuraciones de la base (${error instanceof Error ? error.message : error}); usando .env.`
    );
  }

  const accountSid = db.twilio_account_sid || limpiar(process.env.TWILIO_ACCOUNT_SID);
  const authToken = db.twilio_auth_token || limpiar(process.env.TWILIO_AUTH_TOKEN);
  const whatsappNumber = (
    db.twilio_whatsapp_number ||
    limpiar(process.env.TWILIO_WHATSAPP_NUMBER) ||
    '+14155238886'
  ).replace('whatsapp:', '');
  const adminWhatsApp = (db.admin_whatsapp || limpiar(process.env.ADMIN_WHATSAPP_NUMBER)).replace(
    'whatsapp:',
    ''
  );

  return { accountSid, authToken, whatsappNumber, adminWhatsApp };
}

async function testWhatsApp() {
  const { accountSid, authToken, whatsappNumber, adminWhatsApp } = await leerConfig();

  console.log('📱 Probando envío de WhatsApp...');
  console.log(`   Desde: ${whatsappNumber}`);
  console.log(`   Hacia: ${adminWhatsApp}`);

  if (!accountSid || !authToken) {
    console.error('❌ Faltan TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN (base de datos o .env)');
    process.exit(1);
  }

  const client = twilio(accountSid, authToken);

  try {
    const message = await client.messages.create({
      body: `*TEST - Anulación de Venta*

✅ Esto es una prueba de envío de WhatsApp.

Si recibiste este mensaje, la integración con Twilio está funcionando correctamente.

Fecha: ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}`,
      from: `whatsapp:${whatsappNumber}`,
      to: `whatsapp:${adminWhatsApp}`
    });

    console.log('✅ Mensaje enviado correctamente!');
    console.log(`   SID: ${message.sid}`);
    console.log(`   Estado: ${message.status}`);
    console.log(`   Fecha: ${message.dateCreated}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error enviando WhatsApp:', message);

    if (message.includes('sandbox')) {
      console.log('\n💡 El número admin debe unirse al sandbox primero.');
      console.log(`   Envía "join <palabra>" al número ${whatsappNumber} desde WhatsApp.`);
    }
  }
}

testWhatsApp();
