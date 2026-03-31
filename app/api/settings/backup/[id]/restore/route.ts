import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';
import { getAuth } from '@/lib/auth/auth-app';

export const POST = withAppApiWrapper(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const user = await getAuth();
    if (!user)
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const role = user.role.toLowerCase();
    if (role !== 'administrador') {
      return NextResponse.json({ success: false, message: 'Acceso denegado' }, { status: 403 });
    }

    const id = (await params).id;
    const body = await request.json();
    const { action } = body;

    // Get backup data
    const backups = await query(
      'SELECT * FROM backups WHERE id_backup = ?',
      [id]
    ) as any[];

    if (backups.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Backup no encontrado' },
        { status: 404 }
      );
    }

    const backup = backups[0];

    if (!backup.json_data) {
      return NextResponse.json(
        { success: false, error: 'El backup no tiene datos para restaurar' },
        { status: 400 }
      );
    }

    const backupData = JSON.parse(backup.json_data);
    
    // Disable foreign key checks
    await query('SET FOREIGN_KEY_CHECKS = 0');

    let restoredTables = 0;
    let totalRecords = 0;

    // Restore each table
    const entries = Object.entries(backupData) as [string, any[]][];
    for (const [tableName, records] of entries) {
      if (!records || records.length === 0) continue;

      try {
        // Clear existing data first
        await query(`DELETE FROM \`${tableName}\``);

        // Insert backup data in batches
        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          
          if (batch.length > 0) {
            const columns = Object.keys(batch[0]);
            const placeholders = batch.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
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
        console.warn(`Warning: Could not restore table ${tableName}:`, err);
      }
    }

    // Re-enable foreign key checks
    await query('SET FOREIGN_KEY_CHECKS = 1');

    // Update backup status to indicate it was restored
    await query(
      'UPDATE backups SET estado = 2 WHERE id_backup = ?',
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'Backup restaurado correctamente',
      restored: {
        tablas: restoredTables,
        registros: totalRecords
      }
    });

  } catch (error) {
    console.error('Error restoring backup:', error);
    // Re-enable foreign key checks on error
    try {
      await query('SET FOREIGN_KEY_CHECKS = 1');
    } catch {}
    
    return NextResponse.json(
      { success: false, error: 'Error al restaurar el backup' },
      { status: 500 }
    );
  }
});