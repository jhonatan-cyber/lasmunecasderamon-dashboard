const twilio = require('twilio');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = (process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886').replace(
  'whatsapp:',
  ''
);
const adminWhatsApp = (process.env.ADMIN_WHATSAPP_NUMBER || '+56987904824').replace(
  'whatsapp:',
  ''
);

if (!accountSid || !authToken) {
  console.error('❌ Faltan TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN en .env');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function testWhatsApp() {
  console.log('📱 Probando envío de WhatsApp...');
  console.log(`   Desde: ${whatsappNumber}`);
  console.log(`   Hacia: ${adminWhatsApp}`);

  try {
    const message = await client.messages.create({
      body: `*TEST - Anulación de Venta*

✅ Esto es una prueba de envío de WhatsApp.

Si recibiste este mensaje, la integración con Twilio está funcionando correctamente.

Fecha: ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}`,
      from: `whatsapp:${whatsappNumber}`,
      to: `whatsapp:+${adminWhatsApp.replace('+', '')}`
    });

    console.log('✅ Mensaje enviado correctamente!');
    console.log(`   SID: ${message.sid}`);
    console.log(`   Estado: ${message.status}`);
    console.log(`   Fecha: ${message.dateCreated}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error enviando WhatsApp:', message);

    if (message.toLowerCase().includes('sandbox')) {
      console.log('\n💡 El número admin debe unirse al sandbox primero.');
      console.log(`   Envía "join <palabra>" al número ${whatsappNumber} desde WhatsApp.`);
    }
  }
}

testWhatsApp();
