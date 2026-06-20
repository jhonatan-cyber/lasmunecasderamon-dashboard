import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';
import { logger } from '@/lib/utils/logger';

const PROTECTED_TABLES = [
  'usuarios',
  'roles',
  'permissions',
  'configuraciones',
  'habitaciones',
  'productos',
  'categorias',

  'role_permissions'
];

export const POST = withAppAuth(
  async () => {
    const tables = (await query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
    `)) as Array<{ TABLE_NAME: string }>;

    await query('SET FOREIGN_KEY_CHECKS = 0');

    const deletedTables: string[] = [];
    const skippedTables: string[] = [];

    for (const table of tables) {
      const tableName = table.TABLE_NAME;

      if (PROTECTED_TABLES.includes(tableName) || tableName === '_migrations') {
        skippedTables.push(tableName);
        continue;
      }

      await query(`DELETE FROM \`${tableName}\``);
      deletedTables.push(tableName);
    }

    await query('SET FOREIGN_KEY_CHECKS = 1');

    logger.warn('[database-clean] Base de datos limpiada', {
      deletedCount: deletedTables.length,
      deletedTables
    });

    return NextResponse.json({
      success: true,
      message: 'Base de datos limpiada correctamente',
      deletedTables,
      skippedTables,
      deletedCount: deletedTables.length,
      skippedCount: skippedTables.length
    });
  },
  { requiredPermission: { module: 'settings', action: 'write' } }
);
