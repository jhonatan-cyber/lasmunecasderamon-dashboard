const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lasmunecasderamon',
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  try {
    const [columns] = await connection.query("DESCRIBE cuentas");
    console.log("Columns in cuentas:", JSON.stringify(columns, null, 2));
    const [columnsDetalle] = await connection.query("DESCRIBE detalle_cuentas");
    console.log("Columns in detalle_cuentas:", JSON.stringify(columnsDetalle, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
main();
