const { loadTwilioConfig } = require('./lib/twilio-config');

async function testWhatsApp() {
  const { client, accountSid, authToken, whatsappNumber, adminWhatsApp, origen } =
    await loadTwilioConfig();

  console.log('📱 Probando envío de WhatsApp...');
  console.log(`   Desde: ${whatsappNumber} (${origen.twilio_whatsapp_number})`);
  console.log(`   Hacia: ${adminWhatsApp} (${origen.admin_whatsapp})`);
  console.log(`   SID:   ${accountSid} (${origen.twilio_account_sid})`);

  if (!client) {
    console.error('❌ Faltan TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN (base de datos o .env)');
    process.exit(1);
  }
  if (!adminWhatsApp) {
    console.error('❌ Falta el WhatsApp del administrador (base de datos o .env)');
    process.exit(1);
  }

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
