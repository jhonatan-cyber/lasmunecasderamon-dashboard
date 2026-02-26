import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido`
    });
  }

  const { userId, module, action } = req.body;

  if (!userId || !module || !action) {
    return res.status(400).json({
      success: false,
      message: 'userId, module y action son requeridos'
    });
  }

  try {
    // Obtener el rol del usuario
    const userResult = (await query(
      `
      SELECT rol_id FROM usuarios WHERE id_usuario = ?
    `,
      [userId]
    )) as any[];

    if (!userResult || userResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const roleId = userResult[0].rol_id;

    if (!roleId) {
      // Usuario sin rol asignado
      return res.status(200).json({
        success: true,
        hasPermission: false
      });
    }

    // Verificar si el usuario es administrador
    const roleResult = (await query(
      `
      SELECT nombre FROM roles WHERE id_rol = ?
    `,
      [roleId]
    )) as any[];

    if (roleResult.length > 0 && roleResult[0].nombre.toLowerCase() === 'administrador') {
      return res.status(200).json({
        success: true,
        hasPermission: true
      });
    }

    // Modulos equivalentes en ingles y español
    const moduleMap: Record<string, string[]> = {
      'users': ['usuarios', 'users'],
      'clients': ['clientes', 'clients'],
      'products': ['productos', 'products'],
      'categories': ['categorias', 'categories'],
      'orders': ['pedidos', 'orders'],
      'reports': ['reportes', 'reports'],
      'sales': ['ventas', 'sales'],
      'attendance': ['asistencias', 'attendance'],
      'overtime': ['horas_extras', 'overtime'],
      'cash_register': ['caja', 'cash_register'],
      'accounts': ['cuentas', 'accounts'],
      'tips': ['propinas', 'tips'],
      'commissions': ['comisiones', 'commissions'],
      'payroll': ['pagos_trabajadores', 'payroll'],
      'payroll_details': ['payroll_details'],
      'advances': ['anticipos', 'advances'],
      'returns': ['devoluciones', 'returns'],
      'roles': ['roles'],
      'rooms': ['rooms'],
      'private_rooms': ['private_rooms']
    };

    const actionMap: Record<string, string[]> = {
      'view': ['view', 'listar_usuarios', 'listar_clientes', 'listar_categoria_productos', 'listar_productos_categoria', 'listar_categorias', 'listar_pedidos', 'listar_reportes', 'listar_ventas', 'listar_roles', 'listar_asistencias', 'listar_horas_extras', 'listar_caja', 'listar_cuentas', 'listar_propinas', 'listar_comisiones', 'listar_pagos', 'listar_detalles', 'listar_anticipos', 'listar_devoluciones', 'listar_habitaciones', 'listar_privados', 'ver_detalles', 'ver_dashboard'],
      'create': ['create', 'crear', 'agregar_productos'],
      'process': ['process', 'registar_venta', 'registar_cuenta'],
      'edit': ['edit', 'editar', 'registar_venta', 'registar_cuenta', 'process'],
      'delete': ['delete', 'eliminar', 'anular']
    };

    // Obtener todos los permisos del rol
    const permissions = (await query(
      `
      SELECT p.module, p.action
      FROM role_permissions rp
      INNER JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ? AND p.deleted_at IS NULL
    `,
      [roleId]
    )) as any[];

    // Match exacto
    let hasPermission = permissions.some((p: any) => p.module === module && p.action === action);

    // Si no hay match exacto, buscar en alias
    if (!hasPermission) {
      const allowedModules = moduleMap[module] || [module];
      const allowedActions = actionMap[action] || [action];

      hasPermission = permissions.some((p: any) =>
        allowedModules.includes(p.module) && allowedActions.includes(p.action)
      );
    }

    return res.status(200).json({
      success: true,
      hasPermission
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al verificar el permiso'
    });
  }
}
