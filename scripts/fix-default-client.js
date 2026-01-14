#!/usr/bin/env node

const mysql = require('mysql2/promise');

async function fixDefaultClient() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nuwesoft',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('🔍 Verificando cliente por defecto...\n');

    // Verificar si existe el cliente con id=1
    const [existingClient] = await connection.query(
      'SELECT * FROM clientes WHERE id_cliente = 1'
    );

    if (existingClient.length === 0) {
      console.log('❌ Cliente con ID=1 no existe');
      console.log('✅ Creando cliente por defecto...\n');

      // Crear cliente por defecto
      await connection.query(`
        INSERT INTO clientes (id_cliente, run, nombre, apellido, telefono, estado)
        VALUES (1, '00000000-0', 'Cliente', 'General', '000000000', 1)
        ON DUPLICATE KEY UPDATE id_cliente = 1
      `);

      console.log('✅ Cliente por defecto creado exitosamente');
    } else {
      console.log('✅ Cliente por defecto ya existe:');
      console.log(`   ID: ${existingClient[0].id_cliente}`);
      console.log(`   Nombre: ${existingClient[0].nombre} ${existingClient[0].apellido}`);
      console.log(`   RUN: ${existingClient[0].run}`);
    }

    // Verificar también usuarios
    console.log('\n🔍 Verificando usuario ID=5...\n');
    const [existingUser] = await connection.query(
      'SELECT * FROM usuarios WHERE id_usuario = 5'
    );

    if (existingUser.length === 0) {
      console.log('⚠️  Usuario con ID=5 no existe');
      console.log('   Esto puede causar errores al insertar ventas_usuarios');
    } else {
      console.log('✅ Usuario ID=5 existe:');
      console.log(`   Nick: ${existingUser[0].nick}`);
      console.log(`   Nombre: ${existingUser[0].nombre} ${existingUser[0].apellido}`);
    }

    // Verificar producto ID=2
    console.log('\n🔍 Verificando producto ID=2...\n');
    const [existingProduct] = await connection.query(
      'SELECT * FROM productos WHERE id_producto = 2'
    );

    if (existingProduct.length === 0) {
      console.log('⚠️  Producto con ID=2 no existe');
      console.log('   Esto puede causar errores al insertar detalle_ventas');
    } else {
      console.log('✅ Producto ID=2 existe:');
      console.log(`   Nombre: ${existingProduct[0].nombre}`);
      console.log(`   Precio: $${existingProduct[0].precio}`);
    }

    console.log('\n✅ Verificación completada');
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await connection.end();
    process.exit(1);
  }
}

fixDefaultClient();
