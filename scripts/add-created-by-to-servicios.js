const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function addCreatedByToServicios() {
  let connection;
  
  try {
    // Crear conexión a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'nuwesoft',
      port: parseInt(process.env.DB_PORT || '3306')
    });

    console.log('Conectado a la base de datos');

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '..', 'sql', 'add_created_by_to_servicios.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Dividir el contenido SQL en declaraciones individuales
    const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);

    // Ejecutar cada declaración por separado
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement.trim());
      }
    }
    
    console.log('✅ Campo created_by agregado exitosamente a la tabla servicios');
    console.log('✅ Índice y constraint de foreign key creados');

  } catch (error) {
    console.error('❌ Error al ejecutar la migración:', error.message);
    console.error('❌ Detalles del error:', error);
    
    // Si el error es porque la columna ya existe, no es un error crítico
    if (error.message.includes('Duplicate column name')) {
      console.log('ℹ️  La columna created_by ya existe en la tabla servicios');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('Conexión cerrada');
    }
  }
}

// Ejecutar la migración
addCreatedByToServicios();