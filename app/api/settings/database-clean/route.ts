import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { cleanDatabase } from '@/lib/database/maintenance';
import { logger } from '@/lib/utils/logger';

export const POST = withRoute({ auth: true, audit: true, module: 'settings', action: 'write' },
  async () => {
    const { deletedTables, skippedTables } = await cleanDatabase();

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
  }
);
