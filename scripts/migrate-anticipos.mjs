import mysql from 'mysql2/promise';

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    timezone: '-04:00',
    dateStrings: true,
    charset: 'utf8mb4'
  });

  try {
    console.log('🔄 Ejecutando migración de anticipos...\n');

    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'anticipos'
    `, [process.env.DB_NAME]);

    const existingCols = columns.map(c => c.COLUMN_NAME);

    const migrations = [
      {
        name: 'fecha_aprobacion',
        sql: 'ALTER TABLE anticipos ADD COLUMN fecha_aprobacion DATETIME NULL DEFAULT NULL'
      },
      {
        name: 'fecha_cobro',
        sql: 'ALTER TABLE anticipos ADD COLUMN fecha_cobro DATETIME NULL DEFAULT NULL'
      },
      {
        name: 'entregado_por',
        sql: 'ALTER TABLE anticipos ADD COLUMN entregado_por INT NULL DEFAULT NULL, ADD INDEX idx_entregado_por (entregado_por)'
      }
    ];

    for (const m of migrations) {
      if (existingCols.includes(m.name)) {
        console.log(`  ✅ ${m.name} ya existe`);
      } else {
        await connection.query(m.sql);
        console.log(`  ➕ ${m.name} creado`);
      }
    }

    console.log('\n✅ Migración completada!');
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();