const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lasmunecasderamon',
  port: parseInt(process.env.DB_PORT || '3306'),
};

async function migrate() {
  const conn = await mysql.createConnection(config);
  try {
    console.log('Retrying table creation...');
    
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS clientes_prepago_movimientos (
        id_movimiento VARCHAR(36) PRIMARY KEY,
        cliente_id VARCHAR(36) NOT NULL,
        tipo ENUM('CARGA', 'CONSUMO', 'DEVOLUCION') NOT NULL,
        monto INT NOT NULL,
        metodo_pago VARCHAR(50),
        venta_id VARCHAR(36),
        usuario_id VARCHAR(36),
        fecha_crea DATETIME NOT NULL,
        CONSTRAINT fk_prepago_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id_cliente)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await conn.query(createTableSql);
    console.log('Table "clientes_prepago_movimientos" created successfully');

  } catch (err) {
    console.error('Migration failed:', err.message);
    if (err.sql) console.log('SQL:', err.sql);
  } finally {
    await conn.end();
  }
}

migrate();
