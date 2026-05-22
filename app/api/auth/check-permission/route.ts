import { NextResponse } from 'next/server';
import { query } from '@/lib/database/db';

const actionMap: Record<string, string[]> = {
  view: [
    'view',
    'listar_usuarios',
    'listar_clientes',
    'listar_categoria_productos',
    'listar_productos_categoria',
    'listar_categorias',
    'listar_pedidos',
    'listar_reportes',
    'listar_ventas',
    'listar_roles',
    'listar_asistencias',
    'listar_horas_extras',
    'listar_gratificaciones',
    'listar_caja',
    'listar_cuentas',
    'listar_propinas',
    'listar_comisiones',
    'listar_pagos',
    'listar_detalles',
    'listar_anticipos',
    'listar_devoluciones',
    'listar_habitaciones',
    'listar_privados',
    'ver_detalles',
    'ver_dashboard'
  ],
  create: ['create', 'crear', 'agregar_productos'],
  edit: ['edit', 'editar', 'registar_venta', 'registar_cuenta', 'process'],
  delete: ['delete', 'eliminar', 'anular'],
  process: ['process', 'registar_venta', 'registar_cuenta'],
  export: ['export'],
  anulate: ['anulate', 'anular'],
  open: ['open'],
  close: ['close'],
  withdraw: ['withdraw']
};

// Alias de módulos: lo que llega en la petición → lo que puede estar en la BD
const moduleAliases: Record<string, string[]> = {
  cash_register: ['cash_register', 'cashregister', 'caja', 'finances'],
  cashregister: ['cash_register', 'cashregister', 'caja', 'finances'],
  caja: ['cash_register', 'cashregister', 'caja', 'finances'],
  finances: ['cash_register', 'cashregister', 'caja', 'finances'],
  accounts: ['accounts', 'cuentas'],
  attendance: ['attendance', 'asistencias'],
  overtime: ['overtime', 'horas_extras'],
  tips: ['tips', 'propinas'],
  commissions: ['commissions', 'comisiones'],
  rooms: ['rooms', 'habitaciones'],
  private_rooms: ['private_rooms', 'privados'],
  categories: ['categories', 'categorias'],
  returns: ['returns', 'devoluciones'],
  gratificaciones: ['gratificaciones'],
  payroll: ['payroll', 'pagos_trabajadores'],
  payroll_details: ['payroll_details'],
  roles: ['roles'],
  users: ['users', 'usuarios'],
  clients: ['clients', 'clientes'],
  products: ['products', 'productos'],
  orders: ['orders', 'pedidos'],
  sales: ['sales', 'ventas'],
  advances: ['advances', 'anticipos'],
  reports: ['reports', 'reportes'],
  settings: ['settings']
};

export async function POST(request: Request) {
  try {
    const { userId, module, action } = await request.json();

    if (!userId || !module || !action) {
      return NextResponse.json(
        { success: false, hasPermission: false, message: 'userId, module y action son requeridos' },
        { status: 400 }
      );
    }

    // Obtener rol del usuario
    const userResult = await query<any[]>(
      'SELECT u.rol_id, r.nombre as rol_nombre FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id_rol WHERE u.id_usuario = ?',
      [String(userId)]
    );

    if (!userResult || userResult.length === 0) {
      return NextResponse.json({ success: true, hasPermission: false });
    }

    const roleName = userResult[0].rol_nombre?.toLowerCase() || '';

    if (roleName === 'administrador') {
      return NextResponse.json({ success: true, hasPermission: true });
    }

    const roleId = userResult[0].rol_id;
    if (!roleId) {
      return NextResponse.json({ success: true, hasPermission: false });
    }

    // Resolver módulos y acciones equivalentes
    const resolvedModules = moduleAliases[module] || [module];
    const resolvedActions = actionMap[action] || [action];

    // Consultar directamente en la BD si el rol tiene alguno de los permisos equivalentes
    const placeholdersModules = resolvedModules.map(() => '?').join(',');
    const placeholdersActions = resolvedActions.map(() => '?').join(',');

    const perms = await query<any[]>(
      `SELECT 1 FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?
         AND p.module IN (${placeholdersModules})
         AND p.action IN (${placeholdersActions})
         AND p.deleted_at IS NULL
       LIMIT 1`,
      [String(roleId), ...resolvedModules, ...resolvedActions]
    );

    return NextResponse.json({ success: true, hasPermission: perms.length > 0 });
  } catch (error) {
    console.error('[check-permission] Error:', error);
    return NextResponse.json({ success: false, hasPermission: false }, { status: 500 });
  }
}
