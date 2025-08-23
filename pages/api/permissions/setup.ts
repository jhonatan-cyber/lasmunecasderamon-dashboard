import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido`
    });
  }

  try {
    // Crear tabla de permisos si no existe
    await query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        module VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        UNIQUE KEY unique_permission (module, action),
        INDEX idx_module (module),
        INDEX idx_action (action)
      )
    `);

    // Crear tabla de relación roles-permisos si no existe
    await query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id_rol) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
        UNIQUE KEY unique_role_permission (role_id, permission_id),
        INDEX idx_role_id (role_id),
        INDEX idx_permission_id (permission_id)
      )
    `);

    // Insertar permisos básicos del sistema (ordenados alfabéticamente)
    const basicPermissions = [
      // Módulo de anticipos
      { name: 'Aprobar anticipos', description: 'Acceso para aprobar solicitudes de anticipos', module: 'advances', action: 'approve' },
      { name: 'Crear anticipos', description: 'Acceso para crear nuevos anticipos en el sistema', module: 'advances', action: 'create' },
      { name: 'Editar anticipos', description: 'Acceso para modificar información de anticipos', module: 'advances', action: 'edit' },
      { name: 'Eliminar anticipos', description: 'Acceso para eliminar anticipos del sistema', module: 'advances', action: 'delete' },
      { name: 'Ver anticipos', description: 'Acceso para visualizar todos los anticipos', module: 'advances', action: 'view' },
      
      // Módulo de asistencias
      { name: 'Crear asistencias', description: 'Acceso para registrar nuevas asistencias', module: 'attendance', action: 'create' },
      { name: 'Editar asistencias', description: 'Acceso para modificar registros de asistencias', module: 'attendance', action: 'edit' },
      { name: 'Eliminar asistencias', description: 'Acceso para eliminar registros de asistencias', module: 'attendance', action: 'delete' },
      { name: 'Ver asistencias', description: 'Acceso para visualizar todos los registros de asistencias', module: 'attendance', action: 'view' },
      
      // Módulo de caja
      { name: 'Abrir caja', description: 'Acceso para abrir la caja registradora del sistema', module: 'cash_register', action: 'open' },
      { name: 'Cerrar caja', description: 'Acceso para cerrar la caja registradora del sistema', module: 'cash_register', action: 'close' },
      { name: 'Ver caja', description: 'Acceso para visualizar el estado actual de la caja', module: 'cash_register', action: 'view' },
      { name: 'Ver reportes de caja', description: 'Acceso para consultar reportes financieros de caja', module: 'cash_register', action: 'reports' },
      
      // Módulo de categorías
      { name: 'Crear categorías', description: 'Acceso para crear nuevas categorías de productos', module: 'categories', action: 'create' },
      { name: 'Editar categorías', description: 'Acceso para modificar categorías existentes', module: 'categories', action: 'edit' },
      { name: 'Eliminar categorías', description: 'Acceso para eliminar categorías del sistema', module: 'categories', action: 'delete' },
      { name: 'Ver categorías', description: 'Acceso para visualizar todas las categorías', module: 'categories', action: 'view' },
      
      // Módulo de comisiones
      { name: 'Calcular comisiones', description: 'Acceso para calcular comisiones de empleados', module: 'commissions', action: 'calculate' },
      { name: 'Crear comisiones', description: 'Acceso para crear nuevos registros de comisiones', module: 'commissions', action: 'create' },
      { name: 'Editar comisiones', description: 'Acceso para modificar información de comisiones', module: 'commissions', action: 'edit' },
      { name: 'Eliminar comisiones', description: 'Acceso para eliminar registros de comisiones', module: 'commissions', action: 'delete' },
      { name: 'Ver comisiones', description: 'Acceso para visualizar todos los registros de comisiones', module: 'commissions', action: 'view' },
      
      // Módulo de configuración
      { name: 'Editar configuración', description: 'Acceso para modificar la configuración del sistema', module: 'settings', action: 'edit' },
      { name: 'Ver configuración', description: 'Acceso para visualizar la configuración del sistema', module: 'settings', action: 'view' },
      
      // Módulo de cuentas
      { name: 'Cobrar cuentas', description: 'Acceso para procesar cobros de cuentas', module: 'accounts', action: 'collect' },
      { name: 'Crear cuentas', description: 'Acceso para crear nuevas cuentas en el sistema', module: 'accounts', action: 'create' },
      { name: 'Editar cuentas', description: 'Acceso para modificar información de cuentas', module: 'accounts', action: 'edit' },
      { name: 'Eliminar cuentas', description: 'Acceso para eliminar cuentas del sistema', module: 'accounts', action: 'delete' },
      { name: 'Ver cuentas', description: 'Acceso para visualizar todas las cuentas', module: 'accounts', action: 'view' },
      
      // Módulo de devoluciones
      { name: 'Aprobar devoluciones', description: 'Acceso para aprobar solicitudes de devoluciones', module: 'returns', action: 'approve' },
      { name: 'Crear devoluciones', description: 'Acceso para crear nuevos registros de devoluciones', module: 'returns', action: 'create' },
      { name: 'Editar devoluciones', description: 'Acceso para modificar información de devoluciones', module: 'returns', action: 'edit' },
      { name: 'Eliminar devoluciones', description: 'Acceso para eliminar registros de devoluciones', module: 'returns', action: 'delete' },
      { name: 'Ver devoluciones', description: 'Acceso para visualizar todos los registros de devoluciones', module: 'returns', action: 'view' },
      
      // Módulo de habitaciones
      { name: 'Crear habitaciones', description: 'Acceso para crear nuevas habitaciones en el sistema', module: 'rooms', action: 'create' },
      { name: 'Editar habitaciones', description: 'Acceso para modificar información de habitaciones', module: 'rooms', action: 'edit' },
      { name: 'Eliminar habitaciones', description: 'Acceso para eliminar habitaciones del sistema', module: 'rooms', action: 'delete' },
      { name: 'Ver habitaciones', description: 'Acceso para visualizar todas las habitaciones', module: 'rooms', action: 'view' },
      
      // Módulo de horas extras
      { name: 'Aprobar horas extras', description: 'Acceso para aprobar solicitudes de horas extras', module: 'overtime', action: 'approve' },
      { name: 'Crear horas extras', description: 'Acceso para crear nuevos registros de horas extras', module: 'overtime', action: 'create' },
      { name: 'Editar horas extras', description: 'Acceso para modificar información de horas extras', module: 'overtime', action: 'edit' },
      { name: 'Eliminar horas extras', description: 'Acceso para eliminar registros de horas extras', module: 'overtime', action: 'delete' },
      { name: 'Ver horas extras', description: 'Acceso para visualizar todos los registros de horas extras', module: 'overtime', action: 'view' },
      
      // Módulo de pagos trabajadores
      { name: 'Calcular pagos', description: 'Acceso para calcular pagos de trabajadores', module: 'payroll', action: 'calculate' },
      { name: 'Crear pagos', description: 'Acceso para crear nuevos registros de pagos', module: 'payroll', action: 'create' },
      { name: 'Editar pagos', description: 'Acceso para modificar información de pagos', module: 'payroll', action: 'edit' },
      { name: 'Eliminar pagos', description: 'Acceso para eliminar registros de pagos', module: 'payroll', action: 'delete' },
      { name: 'Procesar pagos', description: 'Acceso para procesar pagos de trabajadores', module: 'payroll', action: 'process' },
      { name: 'Ver pagos', description: 'Acceso para visualizar todos los registros de pagos', module: 'payroll', action: 'view' },
      
      // Módulo de pedidos
      { name: 'Crear pedidos', description: 'Acceso para crear nuevos pedidos en el sistema', module: 'orders', action: 'create' },
      { name: 'Editar pedidos', description: 'Acceso para modificar pedidos existentes', module: 'orders', action: 'edit' },
      { name: 'Eliminar pedidos', description: 'Acceso para eliminar pedidos del sistema', module: 'orders', action: 'delete' },
      { name: 'Procesar pedidos', description: 'Acceso para procesar y gestionar pedidos', module: 'orders', action: 'process' },
      { name: 'Ver pedidos', description: 'Acceso para visualizar todos los pedidos', module: 'orders', action: 'view' },
      
      // Módulo de productos
      { name: 'Crear productos', description: 'Acceso para crear nuevos productos en el catálogo', module: 'products', action: 'create' },
      { name: 'Editar productos', description: 'Acceso para modificar información de productos', module: 'products', action: 'edit' },
      { name: 'Eliminar productos', description: 'Acceso para eliminar productos del catálogo', module: 'products', action: 'delete' },
      { name: 'Ver productos', description: 'Acceso para visualizar todos los productos', module: 'products', action: 'view' },
      
      // Módulo de propinas
      { name: 'Crear propinas', description: 'Acceso para registrar nuevas propinas en el sistema', module: 'tips', action: 'create' },
      { name: 'Distribuir propinas', description: 'Acceso para distribuir propinas entre empleados', module: 'tips', action: 'distribute' },
      { name: 'Editar propinas', description: 'Acceso para modificar registros de propinas', module: 'tips', action: 'edit' },
      { name: 'Eliminar propinas', description: 'Acceso para eliminar registros de propinas', module: 'tips', action: 'delete' },
      { name: 'Ver propinas', description: 'Acceso para visualizar todos los registros de propinas', module: 'tips', action: 'view' },
      
      // Módulo de reportes
      { name: 'Exportar reportes', description: 'Acceso para exportar reportes en diferentes formatos', module: 'reports', action: 'export' },
      { name: 'Ver reportes', description: 'Acceso para visualizar reportes del sistema', module: 'reports', action: 'view' },
      
      // Módulo de roles
      { name: 'Activar roles', description: 'Acceso para activar roles deshabilitados', module: 'roles', action: 'activate' },
      { name: 'Crear roles', description: 'Acceso para crear nuevos roles en el sistema', module: 'roles', action: 'create' },
      { name: 'Desactivar roles', description: 'Acceso para desactivar roles del sistema', module: 'roles', action: 'deactivate' },
      { name: 'Editar roles', description: 'Acceso para modificar información de roles', module: 'roles', action: 'edit' },
      { name: 'Eliminar roles', description: 'Acceso para eliminar roles del sistema', module: 'roles', action: 'delete' },
      { name: 'Gestionar permisos', description: 'Acceso para asignar y gestionar permisos de roles', module: 'roles', action: 'permissions' },
      { name: 'Ver roles', description: 'Acceso para visualizar todos los roles del sistema', module: 'roles', action: 'view' },
      
      // Módulo de servicios
      { name: 'Crear servicios', description: 'Acceso para crear nuevos servicios en el sistema', module: 'services', action: 'create' },
      { name: 'Editar servicios', description: 'Acceso para modificar información de servicios', module: 'services', action: 'edit' },
      { name: 'Eliminar servicios', description: 'Acceso para eliminar servicios del sistema', module: 'services', action: 'delete' },
      { name: 'Ver servicios', description: 'Acceso para visualizar todos los servicios', module: 'services', action: 'view' },
      
      // Módulo de usuarios
      { name: 'Activar usuarios', description: 'Acceso para activar usuarios deshabilitados', module: 'users', action: 'activate' },
      { name: 'Crear usuarios', description: 'Acceso para crear nuevos usuarios en el sistema', module: 'users', action: 'create' },
      { name: 'Desactivar usuarios', description: 'Acceso para desactivar usuarios del sistema', module: 'users', action: 'deactivate' },
      { name: 'Editar usuarios', description: 'Acceso para modificar información de usuarios', module: 'users', action: 'edit' },
      { name: 'Eliminar usuarios', description: 'Acceso para eliminar usuarios del sistema', module: 'users', action: 'delete' },
      { name: 'Ver usuarios', description: 'Acceso para visualizar todos los usuarios', module: 'users', action: 'view' },
      
      // Módulo de ventas
      { name: 'Crear ventas', description: 'Acceso para crear nuevas ventas en el sistema', module: 'sales', action: 'create' },
      { name: 'Editar ventas', description: 'Acceso para modificar información de ventas', module: 'sales', action: 'edit' },
      { name: 'Eliminar ventas', description: 'Acceso para eliminar ventas del sistema', module: 'sales', action: 'delete' },
      { name: 'Ver reportes de ventas', description: 'Acceso para consultar reportes de ventas', module: 'sales', action: 'reports' },
      { name: 'Ver ventas', description: 'Acceso para visualizar todas las ventas', module: 'sales', action: 'view' },
    ];

    for (const permission of basicPermissions) {
      await query(`
        INSERT IGNORE INTO permissions (name, description, module, action) 
        VALUES (?, ?, ?, ?)
      `, [permission.name, permission.description, permission.module, permission.action]);
    }

    // Obtener el rol de administrador
    const adminRole = await query('SELECT id_rol FROM roles WHERE nombre = ?', ['Administrador']) as any[];
    
    if (adminRole && adminRole.length > 0) {
      const adminRoleId = adminRole[0].id_rol;
      
      // Obtener todos los permisos
      const allPermissions = await query('SELECT id FROM permissions WHERE deleted_at IS NULL') as any[];
      
      // Asignar todos los permisos al administrador
      for (const permission of allPermissions) {
        await query(`
          INSERT IGNORE INTO role_permissions (role_id, permission_id) 
          VALUES (?, ?)
        `, [adminRoleId, permission.id]);
      }
    }

    // Verificar que se crearon correctamente
    const permissions = await query('SELECT * FROM permissions WHERE deleted_at IS NULL');
    const rolePermissions = await query('SELECT * FROM role_permissions');
    
    return res.status(200).json({
      success: true,
      message: "Permisos del sistema configurados correctamente",
      data: {
        permissionsCount: Array.isArray(permissions) ? permissions.length : 0,
        rolePermissionsCount: Array.isArray(rolePermissions) ? rolePermissions.length : 0,
        permissions: permissions
      }
    });

  } catch (error) {
    console.error('Error al configurar permisos:', error);
    return res.status(500).json({
      success: false,
      message: "Error al configurar los permisos del sistema",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
}
