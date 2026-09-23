import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { query, generateUUID } from '@/lib/database/db';
import logger from '@/lib/utils/logger';

const CAJERO_PERMISSIONS = [
  { module: 'users', action: 'view', name: 'Ver usuarios' },
  { module: 'users', action: 'create', name: 'Crear usuarios' },
  { module: 'users', action: 'edit', name: 'Editar usuarios' },
  { module: 'users', action: 'delete', name: 'Eliminar usuarios' },
  { module: 'sales', action: 'view', name: 'Ver ventas' },
  { module: 'sales', action: 'create', name: 'Crear ventas' },
  { module: 'sales', action: 'edit', name: 'Editar ventas' },
  { module: 'products', action: 'view', name: 'Ver productos' },
  { module: 'clients', action: 'view', name: 'Ver clientes' },
  { module: 'clients', action: 'create', name: 'Crear clientes' },
  { module: 'clients', action: 'edit', name: 'Editar clientes' },
  { module: 'orders', action: 'view', name: 'Ver pedidos' },
  { module: 'orders', action: 'create', name: 'Crear pedidos' },
  { module: 'orders', action: 'edit', name: 'Editar pedidos' },
  { module: 'orders', action: 'process', name: 'Procesar pedidos' },
  { module: 'advances', action: 'view', name: 'Ver anticipos' },
  { module: 'advances', action: 'create', name: 'Crear anticipos' },
  { module: 'advances', action: 'edit', name: 'Editar anticipos' },
  { module: 'advances', action: 'process', name: 'Procesar anticipos' },

  { module: 'cash_register', action: 'view', name: 'Ver caja' },
  { module: 'cash_register', action: 'open', name: 'Abrir caja' },
  { module: 'cash_register', action: 'close', name: 'Cerrar caja' },
  { module: 'cash_register', action: 'withdraw', name: 'Retirar de caja' },

  { module: 'attendance', action: 'view', name: 'Ver asistencias' },
  { module: 'attendance', action: 'create', name: 'Registrar asistencia' },
  { module: 'overtime', action: 'view', name: 'Ver horas extras' },
  { module: 'overtime', action: 'create', name: 'Crear horas extras' },
  { module: 'tips', action: 'view', name: 'Ver propinas' },
  { module: 'tips', action: 'create', name: 'Crear propinas' },
  { module: 'commissions', action: 'view', name: 'Ver comisiones' },
  { module: 'rooms', action: 'view', name: 'Ver habitaciones' },
  { module: 'rooms', action: 'create', name: 'Crear habitaciones' },
  { module: 'rooms', action: 'edit', name: 'Editar habitaciones' },
  { module: 'accounts', action: 'view', name: 'Ver cuentas' },
  { module: 'accounts', action: 'create', name: 'Crear cuentas' },
  { module: 'accounts', action: 'edit', name: 'Editar cuentas' },
  { module: 'private_rooms', action: 'view', name: 'Ver salas privadas' },
  { module: 'private_rooms', action: 'create', name: 'Crear salas privadas' },
  { module: 'categories', action: 'view', name: 'Ver categorías' },
  { module: 'returns', action: 'view', name: 'Ver devoluciones' },
  { module: 'returns', action: 'create', name: 'Crear devoluciones' },
  { module: 'gratificaciones', action: 'view', name: 'Ver gratificaciones' },
  { module: 'gratificaciones', action: 'create', name: 'Crear gratificaciones' }
];

/**
 * Seed de permisos del rol cajero. Crea permisos faltantes y los asigna.
 *
 * Antes no tenía guard: era un endpoint de arranque pensado para correr una vez a mano,
 * pero cualquiera podía invocarlo y mutar la matriz de permisos del personal. La matriz
 * ya vive en las migraciones, así que este endpoint es redundante; si se usa, solo el
 * administrador.
 */
export const POST = withRoute({ auth: true, access: 'administrator', audit: true }, async () => {
  try {
    const roles = await query<any[]>(
      `SELECT id_rol FROM roles WHERE LOWER(nombre) = 'cajero' LIMIT 1`
    );

    if (!roles || roles.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Rol cajero no encontrado' },
        { status: 404 }
      );
    }

    const cajeroRoleId = roles[0].id_rol;
    let created = 0;
    let assigned = 0;
    let skipped = 0;

    for (const perm of CAJERO_PERMISSIONS) {
      const existing = await query<any[]>(
        `SELECT id FROM permissions WHERE module = ? AND action = ? AND deleted_at IS NULL LIMIT 1`,
        [perm.module, perm.action]
      );

      let permId: string;

      if (existing.length === 0) {
        permId = generateUUID();
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await query(
          `INSERT INTO permissions (id, name, description, module, action, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [permId, perm.name, perm.name, perm.module, perm.action, now, now]
        );
        created++;
      } else {
        permId = existing[0].id;
      }

      const alreadyAssigned = await query<any[]>(
        `SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ? LIMIT 1`,
        [cajeroRoleId, permId]
      );

      if (alreadyAssigned.length === 0) {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await query(
          `INSERT INTO role_permissions (id, role_id, permission_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
          [generateUUID(), cajeroRoleId, permId, now, now]
        );
        assigned++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Setup completado para rol cajero`,
      details: {
        permisosCreados: created,
        permisosAsignados: assigned,
        permisosYaExistentes: skipped,
        total: CAJERO_PERMISSIONS.length
      }
    });
  } catch (error: any) {
    logger.error('[setup-cajero] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error interno' },
      { status: 500 }
    );
  }
});
