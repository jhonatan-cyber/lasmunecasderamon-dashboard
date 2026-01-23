const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nuwesoft',
  port: parseInt(process.env.DB_PORT || '3307')
};

async function fixClientsTable() {
  let connection;
  
  try {
    console.log('🔧 Arreglando tabla de clientes...\n');
    
    connection = await mysql.createConnection(config);
    console.log('✅ Conexión establecida\n');
    
    // 1. Verificar estructura actual de la tabla clientes
    console.log('1. Verificando estructura de tabla clientes...');
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM clientes
    `);
    
    console.log('Columnas actuales:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });
    
    // 2. Agregar columna email si no existe
    console.log('\n2. Agregando columna email si no existe...');
    try {
      await connection.execute(`
        ALTER TABLE clientes 
        ADD COLUMN IF NOT EXISTS email VARCHAR(100) NULL
      `);
      console.log('✅ Columna email agregada');
    } catch (error) {
      console.log(`❌ Error agregando email: ${error.message}`);
    }
    
    // 3. Insertar cliente por defecto
    console.log('\n3. Insertando cliente por defecto...');
    try {
      const [existingClient] = await connection.execute(`
        SELECT id_cliente FROM clientes WHERE nombre = 'Cliente' AND apellido = 'Genérico'
      `);
      
      if (existingClient.length === 0) {
        await connection.execute(`
          INSERT INTO clientes (nombre, apellido, run, telefono, email, status) 
          VALUES ('Cliente', 'Genérico', '11111111-1', '123456789', 'cliente@ejemplo.com', 1)
        `);
        console.log('✅ Cliente por defecto insertado');
      } else {
        console.log('✅ Cliente por defecto ya existe');
      }
    } catch (error) {
      console.log(`❌ Error insertando cliente por defecto: ${error.message}`);
    }
    
    // 4. Verificar clientes existentes
    console.log('\n4. Verificando clientes existentes...');
    const [clientes] = await connection.execute(`
      SELECT id_cliente, nombre, apellido, run, status 
      FROM clientes 
      ORDER BY id_cliente
    `);
    
    console.log(`Total clientes: ${clientes.length}`);
    clientes.forEach(cliente => {
      const estado = cliente.status === 1 ? 'ACTIVO' : 'INACTIVO';
      console.log(`  - ID: ${cliente.id_cliente}, ${cliente.nombre} ${cliente.apellido} (${cliente.run}) - ${estado}`);
    });
    
    console.log('\n🎉 Tabla de clientes arreglada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixClientsTable();