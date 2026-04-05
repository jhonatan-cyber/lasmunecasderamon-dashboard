import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import jwt from 'jsonwebtoken';
import { auditLogger } from '@/lib/utils/logger';

export interface UserPermissions {
  users: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  sales: {
    read: boolean;
    write: boolean;
    delete: boolean;
    anulate: boolean;
  };
  products: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  clients: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  finances: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  reports: {
    read: boolean;
    export: boolean;
  };
  settings: {
    read: boolean;
    write: boolean;
  };
  orders: {
    read: boolean;
    write: boolean;
    delete: boolean;
    process: boolean;
  };
  advances: {
    read: boolean;
    write: boolean;
    delete: boolean;
    process: boolean;
  };
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  name: string;
  lastName: string;
  nick?: string;
  email: string;
  role: string;
  permissions: UserPermissions;
  iat: number;
  exp: number;
}

type AuthenticatedNextApiRequest = NextApiRequest & {
  user?: AuthenticatedUser;
};

const rolePermissions: Record<string, UserPermissions> = {
  administrador: {
    users: { read: true, write: true, delete: true },
    sales: { read: true, write: true, delete: true, anulate: true },
    products: { read: true, write: true, delete: true },
    clients: { read: true, write: true, delete: true },
    finances: { read: true, write: true, delete: true },
    reports: { read: true, export: true },
    settings: { read: true, write: true },
    orders: { read: true, write: true, delete: true, process: true },
    advances: { read: true, write: true, delete: true, process: true }
  },
  cajero: {
    users: { read: true, write: true, delete: true },
    sales: { read: true, write: true, delete: false, anulate: false },
    products: { read: true, write: false, delete: false },
    clients: { read: true, write: true, delete: false },
    finances: { read: false, write: false, delete: false },
    reports: { read: false, export: false },
    settings: { read: false, write: false },
    orders: { read: true, write: true, delete: false, process: true },
    advances: { read: true, write: true, delete: false, process: true }
  },
  garzon: {
    users: { read: false, write: false, delete: false },
    sales: { read: true, write: false, delete: false, anulate: false },
    products: { read: true, write: false, delete: false },
    clients: { read: true, write: false, delete: false },
    finances: { read: false, write: false, delete: false },
    reports: { read: false, export: false },
    settings: { read: false, write: false },
    orders: { read: false, write: false, delete: false, process: false },
    advances: { read: true, write: false, delete: false, process: false }
  },
  anfitriona: {
    users: { read: false, write: false, delete: false },
    sales: { read: true, write: false, delete: false, anulate: false },
    products: { read: true, write: false, delete: false },
    clients: { read: true, write: false, delete: false },
    finances: { read: false, write: false, delete: false },
    reports: { read: false, export: false },
    settings: { read: false, write: false },
    orders: { read: false, write: false, delete: false, process: false },
    advances: { read: true, write: false, delete: false, process: false }
  }
};

export async function getUserPermissionsFromDB(userId: string): Promise<UserPermissions> {
  try {
    const { query } = await import('@/lib/database/db');

    const userResult = await query(`
      SELECT rol_id FROM usuarios WHERE id_usuario = ?
    `, [userId]) as Array<{ rol_id: string | number | null }>;

    if (!userResult || userResult.length === 0 || !userResult[0].rol_id) {
      return rolePermissions.garzon;
    }

    const roleId = userResult[0].rol_id;

    const permissions = await query(`
      SELECT 
        p.module,
        p.action
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ? AND p.deleted_at IS NULL
    `, [String(roleId)]) as Array<{ module: keyof UserPermissions; action: string }>;


    const userPerms: UserPermissions = {
      users: { read: false, write: false, delete: false },
      sales: { read: false, write: false, delete: false, anulate: false },
      products: { read: false, write: false, delete: false },
      clients: { read: false, write: false, delete: false },
      finances: { read: false, write: false, delete: false },
      reports: { read: false, export: false },
      settings: { read: false, write: false },
      orders: { read: false, write: false, delete: false, process: false },
      advances: { read: false, write: false, delete: false, process: false }
    };

    // Mapear acciones de la BD al formato interno del middleware
    // BD: view, create, edit, delete, export, anulate, process, etc.
    // Middleware: read, write, delete, export, anulate, process
    const actionMap: Record<string, string> = {
      'view': 'read',
      'view_details': 'read',
      'create': 'write',
      'edit': 'write',
      'open': 'write',
      'close': 'write',
      'withdraw': 'write',
      'delete': 'delete',
      'export': 'export',
      'anulate': 'anulate',
      'process': 'process',
    };

    permissions.forEach(perm => {
      const mappedAction = actionMap[perm.action] || perm.action;
      
      // Mapear nombres de módulos si son distintos entre la BD y el middleware
      let moduleName = perm.module as string;
      if (moduleName === 'cash_register' || moduleName === 'cashregister') {
        moduleName = 'finances';
      }

      const modulePerms = userPerms[moduleName as keyof UserPermissions];
      if (modulePerms && mappedAction in modulePerms) {
        (modulePerms as any)[mappedAction] = true;
      }
    });

    return userPerms;
  } catch {
    return rolePermissions.garzon; // Fallback a permisos por defecto
  }
}

// Función para obtener permisos del usuario (mantener para compatibilidad)
function getUserPermissions(role: string): UserPermissions {
  return rolePermissions[role] || rolePermissions.garzon;
}

// Función helper para verificar permisos en el código
export function checkPermission(
  user: AuthenticatedUser,
  permission: keyof UserPermissions,
  action: string
): boolean {
  const userPermissions = user.permissions[permission];
  return userPermissions && userPermissions[action as keyof typeof userPermissions] === true;
}

const authMiddleware = {
  checkPermission,
  getUserPermissions
};

export default authMiddleware;

