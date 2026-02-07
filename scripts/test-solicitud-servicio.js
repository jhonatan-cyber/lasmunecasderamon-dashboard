const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Leer variables de entorno manualmente
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
}

loadEnv();

async function testSolicitud() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });

    console.log('✓ Conectado a la base de datos\n');

    // Verificar que existan habitaciones
    const [habitaciones] = await connection.query(
      'SELECT id_habitacion, nombre FROM habitaciones LIMIT 5'
    );
    console.log('Habitaciones disponibles:');
    habitaciones.forEach(h => console.log(`  - ID: ${h.id_habitacion}, Nombre: ${h.nombre}`));

    // Verificar que existan usuarios (anfitrionas)
    const [usuarios] = await connection.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, r.nombre as rol 
       FROM usuarios u 
       INNER JOIN roles r ON u.rol_id = r.id_rol 
       WHERE r.nombre = 'anfitriona' 
       LIMIT 5`
    );
    console.log('\nAnfitrionas disponibles:');
    usuarios.forEach(u => console.log(`  - ID: ${u.id_usuario}, Nombre: ${u.nombre} ${u.apellido}`));

    // Verificar usuario que hará la solicitud
    const [solicitantes] = await connection.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, r.nombre as rol 
       FROM usuarios u 
       INNER JOIN roles r ON u.rol_id = r.id_rol 
       WHERE r.nombre IN ('garzon', 'administrador') 
       LIMIT 1`
    );
    
    if (solicitantes.length === 0) {
      console.log('\n✗ No hay usuarios que puedan hacer solicitudes');
      return;
    }

    console.log('\nUsuario que hará la solicitud:');
    console.log(`  - ID: ${solicitantes[0].id_usuario}, Nombre: ${solicitantes[0].nombre} ${solicitantes[0].apellido}, Rol: ${solicitantes[0].rol}`);

    // Verificar clientes (opcional)
    const [clientes] = await connection.query(
      'SELECT id_cliente, nombre, apellido FROM clientes LIMIT 3'
    );
    console.log('\nClientes disponibles:');
    if (clientes.length > 0) {
      clientes.forEach(c => console.log(`  - ID: ${c.id_cliente}, Nombre: ${c.nombre} ${c.apellido}`));
    } else {
      console.log('  - Sin clientes (opcional)');
    }

    // Intentar insertar una solicitud de prueba
    if (habitaciones.length > 0 && usuarios.length > 0) {
      console.log('\n→ Intentando crear solicitud de prueba...');
      
      const testData = {
        cliente_id: clientes.length > 0 ? clientes[0].id_cliente : null,
        habitacion_id: habitaciones[0].id_habitacion,
        precio_servicio: 50.00,
        precio_habitacion: 30.00,
        anfitrionas_ids: JSON.stringify([usuarios[0].id_usuario]),
        metodo_pago: 'efectivo',
        tiempo: 30,
        total: 80.00,
        iva: 0,
        solicitado_por: solicitantes[0].id_usuario
      };

      console.log('Datos de prueba:', testData);

      const [result] = await connection.query(
        `INSERT INTO solicitudes_servicios 
          (cliente_id, habitacion_id, precio_servicio, precio_habitacion, anfitrionas_ids, 
           metodo_pago, tiempo, total, iva, solicitado_por) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          testData.cliente_id,
          testData.habitacion_id,
          testData.precio_servicio,
          testData.precio_habitacion,
          testData.anfitrionas_ids,
          testData.metodo_pago,
          testData.tiempo,
          testData.total,
          testData.iva,
          testData.solicitado_por
        ]
      );

      console.log(`\n✓ Solicitud de prueba creada con ID: ${result.insertId}`);
      
      // Eliminar la solicitud de prueba
      await connection.query(
        'DELETE FROM solicitudes_servicios WHERE id_solicitud = ?',
        [result.insertId]
      );
      console.log('✓ Solicitud de prueba eliminada');
    }

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.code) {
      console.error('Código de error:', error.code);
    }
    if (error.sqlMessage) {
      console.error('Mensaje SQL:', error.sqlMessage);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testSolicitud();
