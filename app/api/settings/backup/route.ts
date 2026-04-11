import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';
import { logger } from '@/lib/utils/logger';

export const POST = withAppAuth(
  async (request: Request, { user }: { params: any; user: any }) => {
    const body = await request.json();
    const { nombre, descripcion } = body;

    const timestamp = new Date();
    const dateStr = timestamp.toISOString().split('T')[0];
    const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-');
    const backupName = nombre || `backup_${dateStr}_${timeStr}`;

    const tables = (await query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
    `)) as Array<{ TABLE_NAME: string }>;

    const backupData: Record<string, any[]> = {};
    let totalRecords = 0;
    let totalBytes = 0;

    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      if (
        [
          'usuarios',
          'roles',
          'role_permissions',
          'permissions',
          'configuraciones',
          'backups',
          '_migrations'
        ].includes(tableName)
      )
        continue;

      try {
        const data = (await query(`SELECT * FROM \`${tableName}\``)) as any[];
        if (data.length > 0) {
          backupData[tableName] = data;
          totalRecords += data.length;
          totalBytes += JSON.stringify(data).length;
        }
      } catch (err) {
        logger.warn(`Warning: Could not backup table ${tableName}:`, { err, tableName });
      }
    }

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
  },
  { requiredPermission: { module: 'settings', action: 'write' } }
);

export const GET = withAppAuth(
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
  },
  { requiredPermission: { module: 'settings', action: 'read' } }
);
