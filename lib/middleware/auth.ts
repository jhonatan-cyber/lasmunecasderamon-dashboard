import type { NextApiRequest, NextApiResponse, NextApiHandler } from "next";
import jwt from "jsonwebtoken";
import { logger, auditLogger } from '../logger';

// Tipos para permisos y roles
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
}

export interface AuthenticatedUser {
  id: number;
  username: string;
  email: string;
  role: string;
  permissions: UserPermissions;
  iat: number;
  exp: number;
}

// Mapeo de roles a permisos
const rolePermissions: Record<string, UserPermissions> = {
  administrador: {
    users: { read: true, write: true, delete: true },
    sales: { read: true, write: true, delete: true, anulate: true },
    products: { read: true, write: true, delete: true },
    clients: { read: true, write: true, delete: true },
    finances: { read: true, write: true, delete: true },
    reports: { read: true, export: true },
    settings: { read: true, write: true }
  },
  cajero: {
    users: { read: false, write: false, delete: false },
    sales: { read: true, write: true, delete: false, anulate: false },
    products: { read: true, write: false, delete: false },
    clients: { read: true, write: true, delete: false },
    finances: { read: false, write: false, delete: false },
    reports: { read: false, export: false },
    settings: { read: false, write: false }
  },
  garzon: {
    users: { read: false, write: false, delete: false },
    sales: { read: true, write: false, delete: false, anulate: false },
    products: { read: true, write: false, delete: false },
    clients: { read: true, write: false, delete: false },
    finances: { read: false, write: false, delete: false },
    reports: { read: false, export: false },
    settings: { read: false, write: false }
  },
  anfitriona: {
    users: { read: false, write: false, delete: false },
    sales: { read: true, write: false, delete: false, anulate: false },
    products: { read: true, write: false, delete: false },
    clients: { read: true, write: false, delete: false },
    finances: { read: false, write: false, delete: false },
    reports: { read: false, export: false },
    settings: { read: false, write: false }
  }
};

// Función para obtener permisos del usuario
function getUserPermissions(role: string): UserPermissions {
  return rolePermissions[role] || rolePermissions.garzon;
}

// Middleware de autenticación mejorado
export function withAuth(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    let token = null;
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    
    // logs removidos
    
    // 1. Buscar en el header Authorization
    const auth = req.headers.authorization;
    if (auth && auth.startsWith("Bearer ")) {
      token = auth.replace("Bearer ", "");
      // token in Authorization
    }
    
    // 2. Si no hay token, buscar en la cookie 'token'
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
      // token in cookies
    }
    
    if (!token) {
      // no token
      auditLogger.securityEvent(0, 'AUTH_FAILED', { 
        reason: 'No token provided',
        ip: clientIP,
        path: req.url 
      });
      return res.status(401).json({ 
        success: false, 
        message: "Token no proporcionado",
        code: 'NO_TOKEN'
      });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret") as AuthenticatedUser;
      
      // Agregar permisos al usuario
      decoded.permissions = getUserPermissions(decoded.role);
      
      // @ts-ignore
      req.user = decoded;
      
      // Log de acceso exitoso
      auditLogger.dataAccess(decoded.id, 'API_ACCESS', req.url || '', {
        method: req.method,
        ip: clientIP,
        userAgent: req.headers['user-agent']
      });
      
      return handler(req, res);
    } catch (err) {
      auditLogger.securityEvent(0, 'AUTH_FAILED', { 
        reason: 'Invalid token',
        ip: clientIP,
        path: req.url,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
      
      return res.status(401).json({ 
        success: false, 
        message: "Token inválido o expirado",
        code: 'INVALID_TOKEN'
      });
    }
  };
}

// Middleware para validar permisos específicos
export function withPermission(permission: keyof UserPermissions, action: string) {
  return function(handler: NextApiHandler) {
    return withAuth(async (req: NextApiRequest, res: NextApiResponse) => {
      // @ts-ignore
      const user = req.user as AuthenticatedUser;
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Usuario no autenticado",
          code: 'NOT_AUTHENTICATED'
        });
      }
      
      const userPermissions = user.permissions[permission];
      if (!userPermissions || !userPermissions[action as keyof typeof userPermissions]) {
        auditLogger.securityEvent(user.id, 'PERMISSION_DENIED', {
          permission,
          action,
          path: req.url,
          ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
        });
        
        return res.status(403).json({ 
          success: false, 
          message: "No tienes permisos para realizar esta acción",
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }
      
      return handler(req, res);
    });
  };
}

// Middleware para roles específicos
export function withRole(allowedRoles: string[]) {
  return function(handler: NextApiHandler) {
    return withAuth(async (req: NextApiRequest, res: NextApiResponse) => {
      // @ts-ignore
      const user = req.user as AuthenticatedUser;
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Usuario no autenticado",
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
          message: "No tienes el rol necesario para acceder a este recurso",
          code: 'INSUFFICIENT_ROLE'
        });
      }
      
      return handler(req, res);
    });
  };
}

// Función helper para verificar permisos en el código
export function checkPermission(user: AuthenticatedUser, permission: keyof UserPermissions, action: string): boolean {
  const userPermissions = user.permissions[permission];
  return userPermissions && userPermissions[action as keyof typeof userPermissions] === true;
}

// Función para obtener información del usuario actual
export function getCurrentUser(req: NextApiRequest): AuthenticatedUser | null {
  // @ts-ignore
  return req.user || null;
}

export default {
  withAuth,
  withPermission,
  withRole,
  checkPermission,
  getCurrentUser,
  getUserPermissions
}; 