// Script para verificar que el cliente por defecto existe
import { query } from '../lib/db.js';

async function checkDefaultClient() {
  console.log('🔍 Verificando cliente por defecto...');

  try {
    // Verificar si existe el cliente con ID = 1
    const clientResult = await query('SELECT * FROM clientes WHERE id_cliente = 1');
    
    if (clientResult && clientResult.length > 0) {
      const client = clientResult[0];
      console.log('✅ Cliente por defecto encontrado:');
      console.log(`   ID: ${client.id_cliente}`);
      console.log(`   Nombre: ${client.nombre} ${client.apellido}`);
      console.log(`   RUN: ${client.run}`);
    } else {
      console.log('❌ Cliente por defecto (ID = 1) no encontrado');
      console.log('📝 Creando cliente por defecto...');
      
      // Crear cliente por defecto
      await query(`
        INSERT INTO clientes (id_cliente, nombre, apellido, run, email, telefono, estado) 
        VALUES (1, 'Cliente', 'Genérico', '11111111-1', 'cliente@generico.com', '123456789', 1)
      `);
      
      console.log('✅ Cliente por defecto creado exitosamente');
    }

    // Verificar usuarios disponibles
    console.log('\n👥 Verificando usuarios disponibles...');
    const usersResult = await query(`
      SELECT u.id_usuario, u.nombre, u.apellido, u.nick, r.nombre as rol 
      FROM usuarios u 
      INNER JOIN roles r ON u.rol_id = r.id_rol 
      WHERE u.estado = 1
    `);
    
    if (usersResult && usersResult.length > 0) {
      console.log('✅ Usuarios disponibles:');
      usersResult.forEach(user => {
        console.log(`   ${user.rol}: ${user.nombre} ${user.apellido} (${user.nick})`);
      });
    } else {
      console.log('❌ No se encontraron usuarios activos');
    }

  } catch (error) {
    console.error('❌ Error verificando cliente por defecto:', error);
  }
}

// Ejecutar verificación
checkDefaultClient();
