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
    console.log('Starting migration...');
    
    // 1. Add saldo column to clientes
    try {
        await conn.query('ALTER TABLE clientes ADD COLUMN saldo INT DEFAULT 0 AFTER estado');
        console.log('Column "saldo" added to "clientes"');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('Column "saldo" already exists');
        } else {
            throw e;
        }
    }

    // 2. Create clientes_prepago_movimientos table
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
        FOREIGN KEY (cliente_id) REFERENCES clientes(id_cliente)
      )
    `;
    await conn.query(createTableSql);
    console.log('Table "clientes_prepago_movimientos" created/verified');

    console.log('Migration completed successfully');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await conn.end();
  }
}

migrate();
