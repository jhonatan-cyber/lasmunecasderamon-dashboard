import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { query } from '@/lib/database/db';
import { logger } from '@/lib/utils/logger';

export const POST = withRoute({ auth: true, audit: true, module: 'settings', action: 'write' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;

    const backups = (await query('SELECT * FROM backups WHERE id_backup = ?', [id])) as any[];
    if (backups.length === 0)
      return NextResponse.json({ success: false, error: 'Backup no encontrado' }, { status: 404 });

    const backup = backups[0];
    if (!backup.json_data)
      return NextResponse.json(
        { success: false, error: 'El backup no tiene datos para restaurar' },
        { status: 400 }
      );

    const backupData = JSON.parse(backup.json_data);
    await query('SET FOREIGN_KEY_CHECKS = 0');

    let restoredTables = 0;
    let totalRecords = 0;

    try {
      for (const [tableName, records] of Object.entries(backupData) as [string, any[]][]) {
        if (!records || records.length === 0) continue;
        try {
          await query(`DELETE FROM \`${tableName}\``);
          const batchSize = 100;
          for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            if (batch.length > 0) {
              const columns = Object.keys(batch[0]);
              const placeholders = batch
                .map(() => `(${columns.map(() => '?').join(', ')})`)
                .join(', ');
              const values = batch.flatMap(row => columns.map(col => row[col]));
              await query(
                `INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES ${placeholders}`,
                values
              );
            }
          }
          restoredTables++;
          totalRecords += records.length;
        } catch (err) {
          logger.warn(`Warning: Could not restore table ${tableName}:`, { err, tableName });
        }
      }

      await query('SET FOREIGN_KEY_CHECKS = 1');
      await query('UPDATE backups SET estado = 2 WHERE id_backup = ?', [id]);

      return NextResponse.json({
        success: true,
        message: 'Backup restaurado correctamente',
        restored: { tablas: restoredTables, registros: totalRecords }
      });
    } catch (error) {
      logger.error('Error restoring backup:', { error });
      try {
        await query('SET FOREIGN_KEY_CHECKS = 1');
      } catch {}
      return NextResponse.json(
        { success: false, error: 'Error al restaurar el backup' },
        { status: 500 }
      );
    }
  }
);
