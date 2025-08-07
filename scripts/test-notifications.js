#!/usr/bin/env node

/**
 * Script para probar las notificaciones en tiempo real
 * Uso: node scripts/test-notifications.js
 */

const EventSource = require('eventsource');

console.log('🧪 Iniciando prueba de notificaciones en tiempo real...\n');

// Conectar al SSE endpoint
const eventSource = new EventSource('http://localhost:3000/api/notifications/sse');

let messageCount = 0;
let newOrderCount = 0;
const processedNotifications = new Set();

eventSource.onopen = () => {
  console.log('✅ Conectado al servidor SSE');
  console.log('📡 Esperando notificaciones...\n');
};

eventSource.onmessage = (event) => {
  messageCount++;
  const data = JSON.parse(event.data);
  
  console.log(`📨 Mensaje #${messageCount} recibido:`);
  console.log(`   Tipo: ${data.type}`);
  console.log(`   Timestamp: ${data.timestamp}`);
  
  if (data.type === 'new_order') {
    newOrderCount++;
    const notificationId = `${data.data.id}_${data.data.codigo}_${data.data.timestamp}`;
    
    if (processedNotifications.has(notificationId)) {
      console.log(`   🚫 DUPLICADO DETECTADO! ID: ${notificationId}`);
    } else {
      processedNotifications.add(notificationId);
      console.log(`   🎉 ¡NUEVO PEDIDO! #${data.data.codigo}`);
      console.log(`   👤 Cliente: ${data.data.cliente}`);
      console.log(`   🧑‍💼 Mesero: ${data.data.mesero}`);
      console.log(`   💰 Total: $${data.data.total.toLocaleString()}`);
      console.log(`   🆔 ID único: ${notificationId}`);
    }
  } else if (data.type === 'connected') {
    console.log(`   🔗 ${data.message}`);
    console.log(`   🆔 Client ID: ${data.clientId}`);
  } else if (data.type === 'ping') {
    console.log(`   🏓 Ping recibido`);
  }
  
  console.log('');
};

eventSource.onerror = (error) => {
  console.error('❌ Error en conexión SSE:', error);
};

// Manejar cierre del script
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando conexión...');
  console.log(`📊 Resumen:`);
  console.log(`   - Total de mensajes: ${messageCount}`);
  console.log(`   - Nuevos pedidos: ${newOrderCount}`);
  console.log(`   - Notificaciones únicas: ${processedNotifications.size}`);
  console.log(`   - Duplicados detectados: ${newOrderCount - processedNotifications.size}`);
  eventSource.close();
  process.exit(0);
});

// Mostrar estadísticas cada 30 segundos
setInterval(() => {
  console.log(`📊 Estadísticas: ${messageCount} mensajes, ${newOrderCount} pedidos, ${processedNotifications.size} únicos`);
}, 30000);

console.log('💡 Para simular un nuevo pedido, crea uno desde la aplicación web');
console.log('💡 Presiona Ctrl+C para salir\n'); 