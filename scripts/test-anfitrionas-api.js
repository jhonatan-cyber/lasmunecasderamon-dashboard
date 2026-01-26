// Script para probar la API de anfitrionas
const fetch = require('node-fetch');

async function testAnfitrionasAPI() {
  try {
    console.log('🧪 Probando API de anfitrionas...');
    
    const response = await fetch('http://localhost:3000/api/users?anfitrionas=1');
    const data = await response.json();
    
    console.log('📊 Respuesta de la API:');
    console.log('- Success:', data.success);
    console.log('- Cantidad de anfitrionas:', data.data?.length || 0);
    
    if (data.data && data.data.length > 0) {
      console.log('👥 Primeras 3 anfitrionas:');
      data.data.slice(0, 3).forEach((anfitriona, index) => {
        console.log(`  ${index + 1}. ID: ${anfitriona.id}, Nick: ${anfitriona.nick}, Nombre: ${anfitriona.name}`);
      });
    } else {
      console.log('❌ No se encontraron anfitrionas');
    }
    
  } catch (error) {
    console.error('❌ Error al probar la API:', error.message);
  }
}

testAnfitrionasAPI();