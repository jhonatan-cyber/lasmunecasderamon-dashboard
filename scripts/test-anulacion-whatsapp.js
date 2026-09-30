const { loadTwilioConfig } = require('./lib/twilio-config');

async function testAnulacionFlow() {
  const { client, whatsappNumber, adminWhatsApp, origen } = await loadTwilioConfig();

  console.log('📱 Probando flujo de anulación de venta...');
  console.log(`   Desde: ${whatsappNumber} (${origen.twilio_whatsapp_number})`);
  console.log(`   Hacia: ${adminWhatsApp} (${origen.admin_whatsapp})`);

  if (!client) {
    console.error('❌ Faltan TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN (base de datos o .env)');
    process.exit(1);
  }
  if (!adminWhatsApp) {
    console.error('❌ Falta el WhatsApp del administrador (base de datos o .env)');
    process.exit(1);
  }

  const numeroFormateado = `+${adminWhatsApp.replace(/^\+/, '')}`;
  console.log(`   Hacia (formatted): ${numeroFormateado}`);

  const mensaje = `*SOLICITUD DE ANULACION DE VENTA*

• Codigo: TEST-001
• Cliente: Cliente de Prueba
• Monto solicitado: $5.000
• Total referencia: $10.000

*Motivo:*
Prueba de anulacion desde script

*Solicitado por:* Test Script

Responde "SI" para aprobar o "NO" para rechazar.`;

  try {
    const message = await client.messages.create({
      body: mensaje,
      from: `whatsapp:${whatsappNumber}`,
      to: `whatsapp:${numeroFormateado}`
    });

    console.log('✅ Mensaje de anulación enviado correctamente!');
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

testAnulacionFlow();
