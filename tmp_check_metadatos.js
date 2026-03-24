
const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: '', database: 'lasmunecasderamon', port: 3306,
  });
  try {
    const [cols] = await conn.query('SHOW COLUMNS FROM clientes_prepago_movimientos');
    const colNames = cols.map(c => c.Field);
    process.stdout.write('COLUMNS: ' + colNames.join(',') + '\n');

    const [rows] = await conn.query('SELECT tipo, monto, metadatos FROM clientes_prepago_movimientos WHERE tipo = "CONSUMO" ORDER BY fecha_crea DESC LIMIT 5');
    process.stdout.write('CONSUMO_COUNT: ' + rows.length + '\n');
    for (const r of rows) {
      process.stdout.write('ROW: tipo=' + r.tipo + ' monto=' + r.monto + ' meta=' + (r.metadatos || 'NULL') + '\n');
    }

    // count all
    const [all] = await conn.query('SELECT tipo, COUNT(*) as cnt FROM clientes_prepago_movimientos GROUP BY tipo');
    for (const a of all) {
      process.stdout.write('TYPE: ' + a.tipo + ' count=' + a.cnt + '\n');
    }
  } catch (err) {
    process.stdout.write('ERROR: ' + err.message + '\n');
  } finally {
    await conn.end();
  }
}

check();
