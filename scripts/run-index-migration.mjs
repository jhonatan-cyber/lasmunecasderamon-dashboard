import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '195.200.4.245',
    user: process.env.DB_USER || 'nuwesoft',
    password: process.env.DB_PASSWORD || 'Ancasi96nuwe',
    database: process.env.DB_NAME || 'lasmunecasderamon',
    connectTimeout: 10000
  });

  try {
    const sqlPath = path.join(__dirname, '..', 'migrations', 'add_composite_indexes.sql');
    const content = fs.readFileSync(sqlPath, 'utf8');

    // Split by lines and extract CALL statements
    const lines = content.split('
');
    const callLines = lines.filter(line => line.trim().startsWith('CALL'));

    console.log(`Encontrados ${callLines.length} índices para crear...\n`);

    for (const line of callLines) {
      const stmt = line.trim();
      try {
        const [rows] = await connection.query(stmt);
        const result = rows && rows[0] ? (rows[0].resultado || JSON.stringify(rows[0])) : 'OK';
        console.log(`  ✅ ${result}`);
      } catch (err) {
        // If it's a duplicate key error, we already have the index
        if (err.errno === 1061) {
          console.log(`  ⚠️  Índice ya existe (saltando)`);
        } else {
          console.log(`  ❌ Error: ${err.message.substring(0, 120)}`);
        }
      }
    }

    console.log('\n✅ Migración completada!');
  } finally {
    await connection.end();
  }
}

runMigration().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
