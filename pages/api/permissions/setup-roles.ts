/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from 'next';
import { query, generateUUID } from '@/lib/db';

// Permisos por defecto para cada rol
const rolePermissions: Record<string, { module: string; action: string }[]> = {
  // Cajero - Gestión de caja, ventas, pedidos y cobros
  Cajero: [
    // Dashboard
    { module: 'dashboard', action: 'view' },
    // Caja
    { module: 'cash_register', action: 'view' },
    { module: 'cash_register', action: 'open' },
    { module: 'cash_register', action: 'close' },
    { module: 'cash_register', action: 'reports' },
    { module: 'cash_register', action: 'withdraw' },
    // Pedidos
    { module: 'orders', action: 'view' },
    { module: 'orders', action: 'create' },
    { module: 'orders', action: 'edit' },
    { module: 'orders', action: 'process' },
    // Ventas
    { module: 'sales', action: 'view' },
    { module: 'sales', action: 'create' },
    { module: 'sales', action: 'edit' },
    // Clientes
    { module: 'clients', action: 'view' },
    { module: 'clients', action: 'create' },
    // Productos
    { module: 'products', action: 'view' },
    // Categorías
    { module: 'categories', action: 'view' },
    // Propinas
    { module: 'tips', action: 'view' },
    { module: 'tips', action: 'create' },
    // Devoluciones
    { module: 'returns', action: 'view' },
    { module: 'returns', action: 'create' },
    // Cuentas
    { module: 'accounts', action: 'view' },
    { module: 'accounts', action: 'create' },
    // Habitaciones/Privados
    { module: 'rooms', action: 'view' },
    { module: 'private_rooms', action: 'view' },
    { module: 'private_rooms', action: 'finalize' },
    // Anticipos
    { module: 'advances', action: 'view' },
    { module: 'advances', action: 'create' },
    { module: 'advances', action: 'approve' },
    // Horas extras
    { module: 'overtime', action: 'view' },
    // Asistencias
    { module: 'attendance', action: 'view' }
  ],

  // Garzon - Servicios de mesa y atención
  Garzon: [
    { module: 'dashboard', action: 'view' },
    { module: 'orders', action: 'view' },
    { module: 'orders', action: 'create' },
    { module: 'products', action: 'view' },
    { module: 'categories', action: 'view' },
    { module: 'clients', action: 'view' },
    { module: 'tips', action: 'view' },
    { module: 'rooms', action: 'view' },
    // Horas extras
    { module: 'overtime', action: 'view' },
    // Asistencias
    { module: 'attendance', action: 'view' }
  ],

  // Anfitriona - Gestión de habitaciones y servicios especiales
  Anfitriona: [
    { module: 'dashboard', action: 'view' },
    { module: 'rooms', action: 'view' },
    { module: 'private_rooms', action: 'view' },
    { module: 'private_rooms', action: 'create' },
    { module: 'commissions', action: 'view' },
    { module: 'clients', action: 'view' }
  ],

  // Mesero - Gestión de pedidos básicos
  Mesero: [
    { module: 'dashboard', action: 'view' },
    { module: 'orders', action: 'view' },
    { module: 'orders', action: 'create' },
    { module: 'products', action: 'view' },
    { module: 'categories', action: 'view' },
    { module: 'clients', action: 'view' },
    { module: 'tips', action: 'view' }
  ],

  // Gerente - Todo excepto configuración del sistema
  Gerente: [
    { module: 'dashboard', action: 'view' },
    // Usuarios
    { module: 'users', action: 'view' },
    { module: 'users', action: 'create' },
    { module: 'users', action: 'edit' },
    // Clientes
    { module: 'clients', action: 'view' },
    { module: 'clients', action: 'create' },
    { module: 'clients', action: 'edit' },
    // Productos
    { module: 'products', action: 'view' },
    { module: 'products', action: 'create' },
    { module: 'products', action: 'edit' },
    // Categorías
    { module: 'categories', action: 'view' },
    { module: 'categories', action: 'create' },
    { module: 'categories', action: 'edit' },
    // Pedidos
    { module: 'orders', action: 'view' },
    { module: 'orders', action: 'create' },
    { module: 'orders', action: 'edit' },
    { module: 'orders', action: 'process' },
    // Ventas
    { module: 'sales', action: 'view' },
    { module: 'sales', action: 'create' },
    { module: 'sales', action: 'reports' },
    // Reportes
    { module: 'reports', action: 'view' },
    // Roles
    { module: 'roles', action: 'view' },
    // Asistencias
    { module: 'attendance', action: 'view' },
    { module: 'attendance', action: 'create' },
    { module: 'attendance', action: 'edit' },
    // Horas extras
    { module: 'overtime', action: 'view' },
    { module: 'overtime', action: 'create' },
    { module: 'overtime', action: 'approve' },
    // Gratificaciones
    { module: 'gratificaciones', action: 'view' },
    { module: 'gratificaciones', action: 'create' },
    { module: 'gratificaciones', action: 'edit' },
    { module: 'gratificaciones', action: 'delete' },
    { module: 'gratificaciones', action: 'view_details' },
    // Caja
    { module: 'cash_register', action: 'view' },
    { module: 'cash_register', action: 'reports' },
    // Cuentas
    { module: 'accounts', action: 'view' },
    // Propinas
    { module: 'tips', action: 'view' },
    // Comisiones
    { module: 'commissions', action: 'view' },
    // Payroll
    { module: 'payroll', action: 'view' },
    { module: 'payroll_details', action: 'view' },
    // Anticipos
    { module: 'advances', action: 'view' },
    { module: 'advances', action: 'approve' },
    // Devoluciones
    { module: 'returns', action: 'view' },
    // Habitaciones
    { module: 'rooms', action: 'view' },
    { module: 'rooms', action: 'create' },
    { module: 'rooms', action: 'edit' },
    // Privados
    { module: 'private_rooms', action: 'view' }
  ]
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido`
    });
  }

  try {
    const results: Record<string, { assigned: number; errors: string[] }> = {};

    for (const [roleName, permissions] of Object.entries(rolePermissions)) {
      results[roleName] = { assigned: 0, errors: [] };

      // Obtener el id del rol (búsqueda case-insensitive)
      const roleResult = (await query('SELECT id_rol FROM roles WHERE LOWER(nombre) = LOWER(?)', [
        roleName
      ])) as any[];

      if (!roleResult || roleResult.length === 0) {
        results[roleName].errors.push(`Rol "${roleName}" no encontrado`);
        continue;
      }

      const roleId = roleResult[0].id_rol;

      // Asignar cada permiso
      for (const perm of permissions) {
        try {
          // Obtener el id del permiso
          const permResult = (await query(
            'SELECT id FROM permissions WHERE module = ? AND action = ? AND deleted_at IS NULL',
            [perm.module, perm.action]
          )) as any[];

          if (!permResult || permResult.length === 0) {
            results[roleName].errors.push(`Permiso ${perm.module}.${perm.action} no encontrado`);
            continue;
          }

          const permissionId = permResult[0].id;

          // Insertar en role_permissions (ignorar si ya existe)
          await query(
            'INSERT IGNORE INTO role_permissions (id, role_id, permission_id) VALUES (?, ?, ?)',
            [generateUUID(), roleId, permissionId]
          );

          results[roleName].assigned++;
        } catch (err) {
          results[roleName].errors.push(
            `Error asignando ${perm.module}.${perm.action}: ${err instanceof Error ? err.message : 'Error'}`
          );
        }
      }
    }

    // Contar total de permisos asignados
    const totalRolePermissions = (await query('SELECT COUNT(*) as total FROM role_permissions')) as any[];

    return res.status(200).json({
      success: true,
      message: 'Permisos de roles configurados correctamente',
      data: {
        results,
        totalRolePermissions: totalRolePermissions[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Error configurando permisos de roles:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al configurar permisos de roles',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

