import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';
import { logger } from '@/lib/utils/logger';

export const GET = withAppAuth(
  async (request: Request, { params }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;

    const backups = (await query(
      'SELECT nombre, json_data, fecha_crea FROM backups WHERE id_backup = ?',
      [id]
    )) as any[];

    if (backups.length === 0)
      return NextResponse.json({ success: false, error: 'Backup no encontrado' }, { status: 404 });

    const backup = backups[0];
    if (!backup.json_data)
      return NextResponse.json(
        { success: false, error: 'El backup no tiene datos para descargar' },
        { status: 400 }
      );

    const timestamp = new Date(backup.fecha_crea).toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `backup_${backup.nombre}_${timestamp}.json`;

    return new NextResponse(backup.json_data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  },
  { requiredPermission: { module: 'settings', action: 'read' } }
);
