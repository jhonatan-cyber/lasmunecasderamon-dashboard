#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function executeSQLScript(sqlFile) {
  try {
    // Leer el archivo SQL
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Crear conexión a la BD
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'nuwesoft',
      port: parseInt(process.env.DB_PORT || '3306'),
      multipleStatements: true
    });

    console.log(`✅ Conectado a la base de datos`);

    // Ejecutar el script SQL
    await connection.query(sqlContent);
    
    console.log(`✅ Script SQL ejecutado exitosamente`);
    console.log(`✅ Las Foreign Keys ahora tienen ON DELETE CASCADE`);

    await connection.end();
  } catch (error) {
    console.error('❌ Error ejecutando script SQL:', error.message);
    process.exit(1);
  }
}

const sqlFile = process.argv[2] || path.join(__dirname, '..', 'sql', 'update_cascade_delete_clientes.sql');
executeSQLScript(sqlFile);
