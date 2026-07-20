import type { NextApiRequest } from 'next';
import { PermissionsCache } from '@/lib/auth/permissions-cache';

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
  commissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  payroll: {
    read: boolean;
    write: boolean;
  };
  rooms: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  attendance: {
    read: boolean;
    write: boolean;
  };
  overtime: {
    read: boolean;
    write: boolean;
  };
  tips: {
    read: boolean;
    write: boolean;
  };
  gratificaciones: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  accounts: {
    read: boolean;
    write: boolean;
    edit: boolean;
  };
  categories: {
    read: boolean;
    write: boolean;
  };
  returns: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  dashboard: {
    read: boolean;
  };
  private_rooms: {
    read: boolean;
    write: boolean;
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
    advances: { read: true, write: true, delete: true, process: true },
    commissions: { read: true, write: true, delete: true },
    payroll: { read: true, write: true },
    rooms: { read: true, write: true, delete: true },
    attendance: { read: true, write: true },
    overtime: { read: true, write: true },
    tips: { read: true, write: true },
    gratificaciones: { read: true, write: true, delete: true },
    accounts: { read: true, write: true, edit: true },
    categories: { read: true, write: true },
    returns: { read: true, write: true, delete: true },
    dashboard: { read: true },
    private_rooms: { read: true, write: true }
  },
  cajero: {
    users: { read: true, write: true, delete: true },
    sales: { read: true, write: true, delete: false, anulate: false },
    products: { read: true, write: false, delete: false },
    clients: { read: true, write: true, delete: false },
    finances: { read: true, write: true, delete: false },
    reports: { read: false, export: false },
    settings: { read: false, write: false },
    orders: { read: true, write: true, delete: false, process: true },
    advances: { read: true, write: true, delete: false, process: true },
    commissions: { read: true, write: true, delete: false },
    payroll: { read: true, write: true },
    rooms: { read: true, write: true, delete: false },
    attendance: { read: true, write: true },
    overtime: { read: true, write: true },
    tips: { read: true, write: true },
    gratificaciones: { read: true, write: true, delete: false },
    accounts: { read: true, write: true, edit: true },
    categories: { read: true, write: false },
    returns: { read: true, write: true, delete: false },
    dashboard: { read: true },
    private_rooms: { read: true, write: true }
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
    advances: { read: true, write: false, delete: false, process: false },
    commissions: { read: false, write: false, delete: false },
    payroll: { read: false, write: false },
    rooms: { read: false, write: false, delete: false },
    attendance: { read: false, write: false },
    overtime: { read: false, write: false },
    tips: { read: false, write: false },
    gratificaciones: { read: false, write: false, delete: false },
    accounts: { read: false, write: false, edit: false },
    categories: { read: false, write: false },
    returns: { read: false, write: false, delete: false },
    dashboard: { read: true },
    private_rooms: { read: false, write: false }
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
    advances: { read: true, write: false, delete: false, process: false },
    commissions: { read: false, write: false, delete: false },
    payroll: { read: false, write: false },
    rooms: { read: false, write: false, delete: false },
    attendance: { read: false, write: false },
    overtime: { read: false, write: false },
    tips: { read: false, write: false },
    gratificaciones: { read: false, write: false, delete: false },
    accounts: { read: false, write: false, edit: false },
    categories: { read: false, write: false },
    returns: { read: false, write: false, delete: false },
    dashboard: { read: true },
    private_rooms: { read: false, write: false }
  }
};

export async function getUserPermissionsFromDB(userId: string): Promise<UserPermissions> {
  const cached = PermissionsCache.get(userId);
  if (cached) return cached;

  try {
    const { query } = await import('@/lib/database/db');

    const userResult = (await query(
      `SELECT u.rol_id, r.nombre as rol_nombre FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id_rol WHERE u.id_usuario = ?`,
      [userId]
    )) as Array<{ rol_id: string | number | null; rol_nombre: string | null }>;

    const roleKey = (userResult?.[0]?.rol_nombre?.toLowerCase() ||
      'garzon') as keyof typeof rolePermissions;

    if (!userResult || userResult.length === 0 || !userResult[0].rol_id) {
      return rolePermissions[roleKey] || rolePermissions.garzon;
    }

    const roleId = userResult[0].rol_id;

    const permissions = (await query(
      `SELECT p.module, p.action FROM permissions p INNER JOIN role_permissions rp ON p.id = rp.permission_id WHERE rp.role_id = ? AND p.deleted_at IS NULL`,
      [String(roleId)]
    )) as Array<{ module: string; action: string }>;

    if (!permissions || permissions.length === 0) {
      return rolePermissions[roleKey] || rolePermissions.garzon;
    }

    const userPerms: UserPermissions = {
      users: { read: false, write: false, delete: false },
      sales: { read: false, write: false, delete: false, anulate: false },
      products: { read: false, write: false, delete: false },
      clients: { read: false, write: false, delete: false },
      finances: { read: false, write: false, delete: false },
      reports: { read: false, export: false },
      settings: { read: false, write: false },
      orders: { read: false, write: false, delete: false, process: false },
      advances: { read: false, write: false, delete: false, process: false },
      commissions: { read: false, write: false, delete: false },
      payroll: { read: false, write: false },
      rooms: { read: false, write: false, delete: false },
      attendance: { read: false, write: false },
      overtime: { read: false, write: false },
      tips: { read: false, write: false },
      gratificaciones: { read: false, write: false, delete: false },
      accounts: { read: false, write: false, edit: false },
      categories: { read: false, write: false },
      returns: { read: false, write: false, delete: false },
      dashboard: { read: false },
      private_rooms: { read: false, write: false }
    };

    const actionMap: Record<string, string> = {
      view: 'read',
      view_details: 'read',
      create: 'write',
      edit: 'write',
      open: 'write',
      close: 'write',
      withdraw: 'write',
      delete: 'delete',
      export: 'export',
      anulate: 'anulate',
      process: 'process'
    };

    permissions.forEach(perm => {
      const mappedAction = actionMap[perm.action] || perm.action;
      let moduleName = perm.module;
      if (moduleName === 'cash_register' || moduleName === 'cashregister') {
        moduleName = 'finances';
      }
      const modulePerms = userPerms[moduleName as keyof UserPermissions];
      if (modulePerms && mappedAction in modulePerms) {
        (modulePerms as any)[mappedAction] = true;
      }
    });

    PermissionsCache.set(userId, userPerms);
    return userPerms;
  } catch {
    return rolePermissions.garzon;
  }
}

function getUserPermissions(role: string): UserPermissions {
  return rolePermissions[role] || rolePermissions.garzon;
}
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
