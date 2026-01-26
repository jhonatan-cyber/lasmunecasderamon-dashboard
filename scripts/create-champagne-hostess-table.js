const mysql = require('mysql2/promise');
require('dotenv').config();

async function createChampagneHostessTable() {
  let connection;
  
  try {
    // Crear conexión a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'lasmunecasderamon'
    });

    console.log('Conectado a la base de datos');

    // Crear la tabla para asignaciones específicas de anfitrionas
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS detalle_pedidos_anfitrionas (
        id_detalle_anfitriona INT AUTO_INCREMENT PRIMARY KEY,
        detalle_pedido_id INT NOT NULL,
        anfitriona_id INT NOT NULL,
        fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (detalle_pedido_id) REFERENCES detalle_pedidos(id_detalle_pedido) ON DELETE CASCADE,
        FOREIGN KEY (anfitriona_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
        UNIQUE KEY unique_detalle_anfitriona (detalle_pedido_id, anfitriona_id)
      )
    `;

    await connection.execute(createTableQuery);
    console.log('✅ Tabla detalle_pedidos_anfitrionas creada exitosamente');

    // Crear índices para mejorar el rendimiento
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_detalle_pedidos_anfitrionas_detalle ON detalle_pedidos_anfitrionas(detalle_pedido_id)',
      'CREATE INDEX IF NOT EXISTS idx_detalle_pedidos_anfitrionas_anfitriona ON detalle_pedidos_anfitrionas(anfitriona_id)'
    ];

    for (const indexQuery of createIndexes) {
      await connection.execute(indexQuery);
    }
    
    console.log('✅ Índices creados exitosamente');
    console.log('🎉 Configuración completada. Ahora puedes usar la nueva funcionalidad de asignación de anfitrionas para champañas.');

  } catch (error) {
    console.error('❌ Error al crear la tabla:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Conexión cerrada');
    }
  }
}

// Ejecutar el script
createChampagneHostessTable();