import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { env } from '@/lib/utils/env';
import { query } from '@/lib/database/db';
import {
  PUBLIC_PATHS,
  AUTHENTICATED_ONLY_APIS,
  routePermissions,
  apiRoutePermissions
} from '@/lib/middleware/proxy-routes';

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

function addCspHeaders(request: NextRequest): {
  nonce: string;
  cspHeader: string;
  headers: Headers;
} {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);
    return { nonce, cspHeader: '', headers: requestHeaders };
  }
  const scriptSrc = `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' data: https:;
    connect-src 'self' https: ws: wss:;
    media-src 'self' blob: https:;
    frame-src 'self' https://www.google.com https://maps.google.com;
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    object-src 'none';
  `
    .replace(/\s{2,}/g, ' ')
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  return { nonce, cspHeader, headers: requestHeaders };
}

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

async function localCheckUserPermission(
  userId: number,
  module: string,
  action: string
): Promise<boolean> {
  try {
    const userResult = await query<any[]>(
      'SELECT u.rol_id, r.nombre as rol_nombre FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id_rol WHERE u.id_usuario = ?',
      [String(userId)]
    );

    if (!userResult || userResult.length === 0) {
      return false;
    }

    const roleName = userResult[0].rol_nombre?.toLowerCase() || '';

    if (roleName === 'administrador') {
      return true;
    }

    const roleId = userResult[0].rol_id;
    if (!roleId) {
      return false;
    }

    const resolvedModules = moduleAliases[module] || [module];
    const resolvedActions = actionMap[action] || [action];

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

    return perms.length > 0;
  } catch (error) {
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

  const { nonce, cspHeader, headers: cspRequestHeaders } = addCspHeaders(request);

  const origin = request.headers.get('origin');
  const isApi = pathname.startsWith('/api/');

  if (isApi && request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else {
      response.headers.set('Access-Control-Allow-Origin', '*');
    }
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN'
    );
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }

  const addApiHeaders = (res: NextResponse, includeCsp = true) => {
    if (isApi) {
      if (origin) {
        res.headers.set('Access-Control-Allow-Origin', origin);
      } else {
        res.headers.set('Access-Control-Allow-Origin', '*');
      }
      res.headers.set('Access-Control-Allow-Credentials', 'true');
      res.headers.set('Vary', 'Origin');
    }
    if (includeCsp && cspHeader) {
      res.headers.set('Content-Security-Policy', cspHeader);
    }
    return res;
  };

  const isPublicPath = PUBLIC_PATHS.some((path: string) => {
    if (path === '/') return pathname === '/';
    if (path === '/_next' || path === '/img' || path === '/fonts') {
      return pathname.startsWith(path);
    }
    return pathname === path || pathname.startsWith(path + '/');
  });

  if (isPublicPath) {
    const response = NextResponse.next({
      request: {
        headers: cspRequestHeaders
      }
    });
    if (cspHeader) {
      response.headers.set('Content-Security-Policy', cspHeader);
    }
    return response;
  }

  const token =
    request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return addApiHeaders(
        NextResponse.json(
          { success: false, message: 'No autenticado', code: 'NO_TOKEN' },
          { status: 401 }
        )
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return addApiHeaders(
        NextResponse.json(
          { success: false, message: 'Token inválido', code: 'INVALID_TOKEN' },
          { status: 401 }
        )
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const userRole = (payload.role as string)?.toLowerCase();
  const userId = payload.id as number;

  if (userRole === 'administrador') {
    return addApiHeaders(
      NextResponse.next({
        request: {
          headers: cspRequestHeaders
        }
      })
    );
  }

  if (!pathname.startsWith('/api/')) {
    const requiredPermission = Object.entries(routePermissions).find(
      ([route]) => pathname === route || pathname.startsWith(route + '/')
    );

    if (requiredPermission) {
      const [, { module, action }] = requiredPermission;
      if (module === 'dashboard') {
        return addApiHeaders(
          NextResponse.next({
            request: {
              headers: cspRequestHeaders
            }
          })
        );
      }

      const hasPermission = await localCheckUserPermission(userId, module, action);

      if (!hasPermission) {
        return NextResponse.redirect(
          new URL(`/access-denied?module=${module}&action=${action}`, request.url)
        );
      }
    }
  }

  if (pathname.startsWith('/api/')) {
    const isAuthenticatedOnlyApi = AUTHENTICATED_ONLY_APIS.some(apiPath => {
      return pathname === apiPath || pathname.startsWith(apiPath + '/');
    });

    const isUsersApi = pathname === '/api/users';
    const isOwnPermissionsApi = /^\/api\/users\/\d+\/permissions$/.test(pathname);

    if (isAuthenticatedOnlyApi || isUsersApi || isOwnPermissionsApi) {
      return addApiHeaders(
        NextResponse.next({
          request: {
            headers: cspRequestHeaders
          }
        })
      );
    }

    const requiredPermission = Object.entries(apiRoutePermissions).find(([route]) =>
      pathname.startsWith(route)
    );

    if (requiredPermission) {
      const [, { module, action }] = requiredPermission;

      let requiredAction = action;
      if (request.method === 'POST') requiredAction = 'create';
      else if (request.method === 'PUT' || request.method === 'PATCH') requiredAction = 'edit';
      else if (request.method === 'DELETE') requiredAction = 'delete';

      const hasPermission = await localCheckUserPermission(userId, module, requiredAction);

      if (!hasPermission) {
        return addApiHeaders(
          NextResponse.json(
            {
              success: false,
              message: 'No tienes permisos para esta acción',
              code: 'INSUFFICIENT_PERMISSIONS'
            },
            { status: 403 }
          )
        );
      }
    }
  }

  return addApiHeaders(
    NextResponse.next({
      request: {
        headers: cspRequestHeaders
      }
    })
  );
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)']
};
