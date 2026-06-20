import mysql from 'mysql2/promise';


const config = {
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'lasmunecasderamon',
  port: 3306,
  timezone: '-04:00',
  dateStrings: true,
  charset: 'utf8mb4'
};

async function migrate() {
  const connection = await mysql.createConnection(config);

  try {
    console.log('🔄 Ejecutando migración de anticipos...\n');

    const [columns] = (await connection.query(
      `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'anticipos'
    `,
      [config.database]
    )) as [any[], any];

    const existingCols = (columns as any[]).map((c: any) => c.COLUMN_NAME);

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
      },
      {
        name: 'fecha_entrega',
        sql: 'ALTER TABLE anticipos ADD COLUMN fecha_entrega DATETIME NULL DEFAULT NULL'
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
