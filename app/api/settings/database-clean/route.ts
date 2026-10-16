import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { cleanDatabase } from '@/lib/database/maintenance';
import { logger } from '@/lib/utils/logger';

export const POST = withRoute(
  // La auditoría en segundo plano podría volver a insertar datos tras el TRUNCATE.
  // El resultado del vaciado queda registrado en el logger de archivos inferior.
  { auth: true, audit: false, module: 'settings', action: 'write' },
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
