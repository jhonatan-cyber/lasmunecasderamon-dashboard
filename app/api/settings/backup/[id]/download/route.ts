import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const user = await getAuth();
    if (!user)
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const role = user.role.toLowerCase();
    if (role !== 'administrador') {
      return NextResponse.json({ success: false, message: 'Acceso denegado' }, { status: 403 });
    }

    const id = (await params).id;

    // Get backup data
    const backups = await query(
      'SELECT nombre, json_data, fecha_crea FROM backups WHERE id_backup = ?',
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
        { success: false, error: 'El backup no tiene datos para descargar' },
        { status: 400 }
      );
    }

    // Generate filename with timestamp
    const timestamp = new Date(backup.fecha_crea).toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `backup_${backup.nombre}_${timestamp}.json`;

    // Return as downloadable file
    return new NextResponse(backup.json_data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Error downloading backup:', error);
    return NextResponse.json(
      { success: false, error: 'Error al descargar el backup' },
      { status: 500 }
    );
  }
});