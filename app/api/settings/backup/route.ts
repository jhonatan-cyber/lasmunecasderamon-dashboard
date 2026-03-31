import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';
import { getAuth } from '@/lib/auth/auth-app';

const BACKUP_TABLES = [
  'anticipos',
  'anfitrionas',
  'asistencias',
  'cajas',
  'categorias',
  'clientes',
  'clientes_prepago',
  'clientes_prepago_movimientos',
  'codigos',
  'comisiones',
  'cuentas',
  'cuentas_usuarios',
  'detalle_comisiones',
  'detalle_cuentas',
  'detalle_devoluciones_servicios',
  'detalle_devoluciones_ventas',
  'detalle_pedidos',
  'detalle_pedidos_anfitrionas',
  'detalle_propinas',
  'devoluciones_servicios',
  'devoluciones_ventas',
  'error_logs',
  'eventos',
  'gratificaciones',
  'habitaciones',
  'horas_extras',
  'logs_notificaciones',
  'notificaciones',
  'pedidos',
  'pedidos_usuarios',
  'productos',
  'propinas',
  'reservas',
  'solicitudes_servicios',
  'usuarios_bitacora',
  'ventas'
];

export const POST = withAppApiWrapper(async (request: Request) => {
  try {
    const user = await getAuth();
    if (!user)
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const role = user.role.toLowerCase();
    if (role !== 'administrador') {
      return NextResponse.json({ success: false, message: 'Acceso denegado' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, descripcion } = body;

    // Generate timestamp-based name if not provided
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().split('T')[0].replace(/-/g, '-');
    const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-');
    const backupName = nombre || `backup_${dateStr}_${timeStr}`;

    // Get all tables in database
    const tables = await query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
    `) as Array<{ TABLE_NAME: string }>;

    const backupData: Record<string, any[]> = {};
    let totalRecords = 0;
    let totalBytes = 0;

    // Export each table
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      
      // Skip protected tables
      if (['usuarios', 'roles', 'role_permissions', 'permissions', 'configuraciones', 'backups', '_migrations'].includes(tableName)) {
        continue;
      }

      try {
        const data = await query(`SELECT * FROM \`${tableName}\``) as any[];
        
        if (data.length > 0) {
          backupData[tableName] = data;
          totalRecords += data.length;
          
          // Calculate approximate size
          const jsonSize = JSON.stringify(data).length;
          totalBytes += jsonSize;
        }
      } catch (err) {
        console.warn(`Warning: Could not backup table ${tableName}:`, err);
      }
    }

    // Create backup record
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

  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear el backup' },
      { status: 500 }
    );
  }
});

export const GET = withAppApiWrapper(async () => {
  try {
    const user = await getAuth();
    if (!user)
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const role = user.role.toLowerCase();
    if (role !== 'administrador') {
      return NextResponse.json({ success: false, message: 'Acceso denegado' }, { status: 403 });
    }

    const backups = await query(`
      SELECT id_backup, nombre, descripcion, tablas_incluidas, registros_count, 
             tamano_bytes, fecha_crea, estado
      FROM backups
      ORDER BY fecha_crea DESC
      LIMIT 50
    `) as any[];

    // Parse tablas_incluidas
    const parsedBackups = backups.map(b => ({
      ...b,
      tablas_incluidas: b.tablas_incluidas ? JSON.parse(b.tablas_incluidas) : [],
      tamano_bytes: Number(b.tamano_bytes) || 0
    }));

    return NextResponse.json({
      success: true,
      backups: parsedBackups
    });

  } catch (error) {
    console.error('Error listing backups:', error);
    return NextResponse.json(
      { success: false, error: 'Error al listar los backups' },
      { status: 500 }
    );
  }
});