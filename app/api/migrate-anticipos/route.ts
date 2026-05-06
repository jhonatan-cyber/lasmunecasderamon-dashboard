import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import mysql from 'mysql2/promise';

export const POST = withAppApiWrapper(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
    port: Number(process.env.DB_PORT || 3306),
    timezone: '-04:00',
    dateStrings: true,
    charset: 'utf8mb4'
  });

  try {
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'anticipos'
    `, [process.env.DB_NAME]);

    const existingCols = (columns as any[]).map((c: any) => c.COLUMN_NAME);
    const results: string[] = [];

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
        results.push(`${m.name}: ya existe`);
      } else {
        await connection.query(m.sql);
        results.push(`${m.name}: creado`);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    await connection.end();
  }
});