import { NextResponse } from 'next/server';
import { query } from '@/lib/database/db';

const PROTECTED_TABLES = [
  'usuarios',
  'roles',
  'role_permissions',
  'permissions',
  'configuraciones'
];

export async function POST() {
  try {
    // Get all tables in the database
    const tables = await query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
    `) as Array<{ TABLE_NAME: string }>;

    // Get foreign key checks state
    await query('SET FOREIGN_KEY_CHECKS = 0');

    const deletedTables: string[] = [];
    const skippedTables: string[] = [];

    // Delete data from each table (except protected ones)
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      
      if (PROTECTED_TABLES.includes(tableName)) {
        skippedTables.push(tableName);
        continue;
      }

      // Skip migrations table
      if (tableName === '_migrations') {
        skippedTables.push(tableName);
        continue;
      }

      await query(`DELETE FROM \`${tableName}\``);
      deletedTables.push(tableName);
    }

    // Re-enable foreign key checks
    await query('SET FOREIGN_KEY_CHECKS = 1');

    return NextResponse.json({
      success: true,
      message: 'Base de datos limpiada correctamente',
      deletedTables,
      skippedTables,
      deletedCount: deletedTables.length,
      skippedCount: skippedTables.length
    });

  } catch (error) {
    console.error('Error cleaning database:', error);
    return NextResponse.json(
      { error: 'Error al limpiar la base de datos' },
      { status: 500 }
    );
  }
}