/**
 * Resuelve la configuración de Twilio para los scripts de prueba.
 *
 * Prioridad: tabla `configuraciones` (Configuraciones → WhatsApp) y, si el campo
 * está vacío o la base no responde, las variables del `.env`. Es la misma regla
 * que usa la app en runtime (lib/business/twilioConfig.ts).
 */
const twilio = require('twilio');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');
const postgres = require('../../lib/database/postgres.cjs');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const CLAVES = [
  'twilio_account_sid',
  'twilio_auth_token',
  'twilio_whatsapp_number',
  'admin_whatsapp'
];

const limpiar = valor => (valor || '').trim();

async function leerBase() {
  const client = new Client(postgres.connectionConfig());
  await client.connect();
  try {
    const { rows } = await client.query(
      'SELECT clave, valor FROM configuraciones WHERE clave = ANY($1)',
      [CLAVES]
    );
    return Object.fromEntries(rows.map(row => [row.clave, limpiar(row.valor)]));
  } finally {
    await client.end();
  }
}

async function loadTwilioConfig() {
  let db = {};
  let baseOk = true;
  try {
    db = await leerBase();
  } catch (error) {
    baseOk = false;
    console.warn(`⚠️  No se pudo leer configuraciones de la base (${error.message}); usando .env.`);
  }

  const accountSid = db.twilio_account_sid || limpiar(process.env.TWILIO_ACCOUNT_SID);
  const authToken = db.twilio_auth_token || limpiar(process.env.TWILIO_AUTH_TOKEN);
  const whatsappNumber = (
    db.twilio_whatsapp_number ||
    limpiar(process.env.TWILIO_WHATSAPP_NUMBER) ||
    '+14155238886'
  ).replace('whatsapp:', '');
  const adminWhatsApp = (
    db.admin_whatsapp ||
    limpiar(process.env.ADMIN_WHATSAPP_NUMBER) ||
    ''
  ).replace('whatsapp:', '');

  const origen = clave => {
    if (db[clave]) return 'base de datos';
    return baseOk ? '.env (campo vacío en la base)' : '.env';
  };

  return {
    accountSid,
    authToken,
    whatsappNumber,
    adminWhatsApp,
    client: accountSid && authToken ? twilio(accountSid, authToken) : null,
    origen: {
      twilio_account_sid: origen('twilio_account_sid'),
      twilio_auth_token: origen('twilio_auth_token'),
      twilio_whatsapp_number: origen('twilio_whatsapp_number'),
      admin_whatsapp: origen('admin_whatsapp')
    }
  };
}

module.exports = { loadTwilioConfig };
