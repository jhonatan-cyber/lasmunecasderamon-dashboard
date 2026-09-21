import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { query } from '@/lib/database/db';
import { restoreDatabase } from '@/lib/database/maintenance';

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

    const restored = await restoreDatabase(JSON.parse(backup.json_data), id);
    return NextResponse.json({ success: true, message: 'Backup restaurado correctamente', restored });
  }
);
