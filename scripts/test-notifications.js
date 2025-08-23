// Script para probar notificaciones en tiempo real
const BASE_URL = 'http://localhost:3000';

async function testNotifications() {
  console.log('🧪 Iniciando prueba de notificaciones...');

  try {
    // 1. Probar conexión SSE
    console.log('📡 Probando conexión SSE...');
    const eventSource = new EventSource(`${BASE_URL}/api/notifications/sse`);
    
    eventSource.onopen = () => {
      console.log('✅ Conexión SSE establecida');
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 Mensaje SSE recibido:', data);
      
      if (data.type === 'new_order') {
        console.log('🎉 ¡Notificación de pedido recibida!');
        console.log('📋 Detalles del pedido:', data.data);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ Error en conexión SSE:', error);
    };

    // 2. Simular creación de pedido (requiere autenticación)
    console.log('📝 Para probar notificaciones completas:');
    console.log('1. Abre múltiples pestañas del dashboard');
    console.log('2. Inicia sesión con diferentes usuarios (admin, cajero, garzón)');
    console.log('3. Crea un pedido con el garzón');
    console.log('4. Verifica que aparezcan notificaciones en las otras pestañas');

    // 3. Mantener conexión abierta
    setTimeout(() => {
      console.log('⏰ Prueba completada. Cerrando conexión...');
      eventSource.close();
    }, 10000);

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar prueba
testNotifications();
