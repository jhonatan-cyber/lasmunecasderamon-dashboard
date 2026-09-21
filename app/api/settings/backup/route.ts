import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { query } from '@/lib/database/db';
import { snapshotDatabase } from '@/lib/database/maintenance';

export const POST = withRoute({ auth: true, audit: true, module: 'settings', action: 'write' },
  async (request: Request, { user }: { params: any; user: any }) => {
    const body = await request.json();
    const { nombre, descripcion } = body;

    const timestamp = new Date();
    const dateStr = timestamp.toISOString().split('T')[0];
    const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-');
    const backupName = nombre || `backup_${dateStr}_${timeStr}`;

    const backupData = await snapshotDatabase();
    const totalRecords = Object.values(backupData).reduce((sum, rows) => sum + rows.length, 0);
    const totalBytes = Buffer.byteLength(JSON.stringify(backupData), 'utf8');

    const backupId = crypto.randomUUID();
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];

    await query(
      `INSERT INTO backups (id_backup, nombre, descripcion, tablas_incluidas, registros_count, tamano_bytes, json_data, fecha_crea, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        backupId,
        backupName,
        descripcion || `Backup automático - ${user.nick}`,
        JSON.stringify(Object.keys(backupData)),
        totalRecords,
        totalBytes,
        JSON.stringify(backupData),
        now
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Backup creado correctamente',
      backup: {
        id: backupId,
        nombre: backupName,
        descripcion,
        tablas_incluidas: Object.keys(backupData).length,
        registros_count: totalRecords,
        tamano_bytes: totalBytes,
        fecha_crea: now
      }
    });
  }
);

export const GET = withRoute({ auth: true, audit: true, module: 'settings', action: 'read' },
  async () => {
    const backups = (await query(`
      SELECT id_backup, nombre, descripcion, tablas_incluidas, registros_count,
             tamano_bytes, fecha_crea, estado
      FROM backups
      ORDER BY fecha_crea DESC
      LIMIT 50
    `)) as any[];

    const parsedBackups = backups.map(b => ({
      ...b,
      tablas_incluidas: b.tablas_incluidas ? JSON.parse(b.tablas_incluidas) : [],
      tamano_bytes: Number(b.tamano_bytes) || 0
    }));

    return NextResponse.json({ success: true, backups: parsedBackups });
  }
);
