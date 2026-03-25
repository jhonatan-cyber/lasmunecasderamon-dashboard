import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import jwt from 'jsonwebtoken';
import { auditLogger } from '../logger';

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
    orders: { read: true, write: true, delete: true, process: true }
  },
  cajero: {
    users: { read: false, write: false, delete: false },
    sales: { read: true, write: true, delete: false, anulate: false },
    products: { read: true, write: false, delete: false },
    clients: { read: true, write: true, delete: false },
    finances: { read: false, write: false, delete: false },
    reports: { read: false, export: false },
    settings: { read: false, write: false },
    orders: { read: true, write: true, delete: false, process: true }
  },
  garzon: {
    users: { read: false, write: false, delete: false },
    sales: { read: true, write: false, delete: false, anulate: false },
    products: { read: true, write: false, delete: false },
    clients: { read: true, write: false, delete: false },
    finances: { read: false, write: false, delete: false },
    reports: { read: false, export: false },
    settings: { read: false, write: false },
    orders: { read: false, write: false, delete: false, process: false }
  },
  anfitriona: {
    users: { read: false, write: false, delete: false },
    sales: { read: true, write: false, delete: false, anulate: false },
    products: { read: true, write: false, delete: false },
    clients: { read: true, write: false, delete: false },
    finances: { read: false, write: false, delete: false },
    reports: { read: false, export: false },
    settings: { read: false, write: false },
    orders: { read: false, write: false, delete: false, process: false }
  }
};

async function getUserPermissionsFromDB(userId: string): Promise<UserPermissions> {
  try {
    const { query } = await import('@/lib/db');

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
    `, [roleId]) as Array<{ module: keyof UserPermissions; action: string }>;


    const userPerms: UserPermissions = {
      users: { read: false, write: false, delete: false },
      sales: { read: false, write: false, delete: false, anulate: false },
      products: { read: false, write: false, delete: false },
      clients: { read: false, write: false, delete: false },
      finances: { read: false, write: false, delete: false },
      reports: { read: false, export: false },
      settings: { read: false, write: false },
      orders: { read: false, write: false, delete: false, process: false }
    };

    permissions.forEach(perm => {
      if (perm.module === 'users' && perm.action === 'read') userPerms.users.read = true;
      if (perm.module === 'users' && perm.action === 'write') userPerms.users.write = true;
      if (perm.module === 'users' && perm.action === 'delete') userPerms.users.delete = true;
      
      if (perm.module === 'sales' && perm.action === 'read') userPerms.sales.read = true;
      if (perm.module === 'sales' && perm.action === 'write') userPerms.sales.write = true;
      if (perm.module === 'sales' && perm.action === 'delete') userPerms.sales.delete = true;
      if (perm.module === 'sales' && perm.action === 'anulate') userPerms.sales.anulate = true;
      
      if (perm.module === 'products' && perm.action === 'read') userPerms.products.read = true;
      if (perm.module === 'products' && perm.action === 'write') userPerms.products.write = true;
      if (perm.module === 'products' && perm.action === 'delete') userPerms.products.delete = true;
      
      if (perm.module === 'clients' && perm.action === 'read') userPerms.clients.read = true;
      if (perm.module === 'clients' && perm.action === 'write') userPerms.clients.write = true;
      if (perm.module === 'clients' && perm.action === 'delete') userPerms.clients.delete = true;
      
      if (perm.module === 'finances' && perm.action === 'read') userPerms.finances.read = true;
      if (perm.module === 'finances' && perm.action === 'write') userPerms.finances.write = true;
      if (perm.module === 'finances' && perm.action === 'delete') userPerms.finances.delete = true;
      
      if (perm.module === 'reports' && perm.action === 'read') userPerms.reports.read = true;
      if (perm.module === 'reports' && perm.action === 'export') userPerms.reports.export = true;
      
      if (perm.module === 'settings' && perm.action === 'read') userPerms.settings.read = true;
      if (perm.module === 'settings' && perm.action === 'write') userPerms.settings.write = true;
      
      if (perm.module === 'orders' && perm.action === 'read') userPerms.orders.read = true;
      if (perm.module === 'orders' && perm.action === 'write') userPerms.orders.write = true;
      if (perm.module === 'orders' && perm.action === 'delete') userPerms.orders.delete = true;
      if (perm.module === 'orders' && perm.action === 'process') userPerms.orders.process = true;
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

// Middleware de autenticación mejorado
export function withAuth(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const authedReq = req as AuthenticatedNextApiRequest;
    let token = null;

    // logs removidos

    // 1. Buscar en el header Authorization
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      token = auth.replace('Bearer ', '');
    }

    // 2. Si no hay token, buscar en la cookie 'token'
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado',
        code: 'NO_TOKEN'
      });
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default_secret'
      ) as AuthenticatedUser;

      // Agregar permisos al usuario desde la base de datos
      decoded.permissions = await getUserPermissionsFromDB(decoded.id);

      authedReq.user = decoded;
      return handler(authedReq, res);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado',
        code: 'INVALID_TOKEN'
      });
    }
  };
}

// Middleware para validar permisos específicos
export function withPermission(permission: keyof UserPermissions, action: string) {
  return function (handler: NextApiHandler) {
    return withAuth(async (req: NextApiRequest, res: NextApiResponse) => {
      const user = (req as AuthenticatedNextApiRequest).user as AuthenticatedUser;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          code: 'NOT_AUTHENTICATED'
        });
      }

      const userPermissions = user.permissions[permission];
      if (!userPermissions || !userPermissions[action as keyof typeof userPermissions]) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para realizar esta acción',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      return handler(req, res);
    });
  };
}

// Middleware para roles específicos
export function withRole(allowedRoles: string[]) {
  return function (handler: NextApiHandler) {
    return withAuth(async (req: NextApiRequest, res: NextApiResponse) => {
      const user = (req as AuthenticatedNextApiRequest).user as AuthenticatedUser;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          code: 'NOT_AUTHENTICATED'
        });
      }

      if (!allowedRoles.includes(user.role)) {
        auditLogger.securityEvent(user.id, 'ROLE_ACCESS_DENIED', {
          userRole: user.role,
          allowedRoles,
          path: req.url,
          ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
        });

        return res.status(403).json({
          success: false,
          message: 'No tienes el rol necesario para acceder a este recurso',
          code: 'INSUFFICIENT_ROLE'
        });
      }

      return handler(req, res);
    });
  };
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

// Función para obtener información del usuario actual
export function getCurrentUser(req: NextApiRequest): AuthenticatedUser | null {
  return (req as AuthenticatedNextApiRequest).user || null;
}

const authMiddleware = {
  withAuth,
  withPermission,
  withRole,
  checkPermission,
  getCurrentUser,
  getUserPermissions
};

export default authMiddleware;

