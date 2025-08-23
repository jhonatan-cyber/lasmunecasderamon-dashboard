require('dotenv').config();
const { query } = require('./lib/db');

async function checkUsers() {
  try {
    console.log('🔍 Verificando usuarios en la base de datos...');
    
    const users = await query('SELECT id_usuario, email, nombre, rol_id, estado FROM usuarios WHERE estado = 1 LIMIT 5');
    console.log('✅ Usuarios encontrados:', users);
    
    if (users.length === 0) {
      console.log('❌ No hay usuarios activos en la base de datos');
    } else {
      console.log('✅ Hay usuarios disponibles para login');
      console.log('📧 Emails disponibles:', users.map(u => u.email));
    }
    
  } catch (error) {
    console.error('❌ Error verificando usuarios:', error);
  }
}

checkUsers();
