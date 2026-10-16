'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSharedSSE } from '@/hooks/shared/useSharedSSE';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';

/**
 * Puente global evento SSE → caché de React Query.
 *
 * El stream de personal (`/api/notifications/sse`) ya llega a todos los clientes, pero hoy
 * solo el dashboard y unas pocas vistas reaccionan a él. Este puente cierra esa brecha:
 * cada tipo de evento declara qué consultas quedan obsoletas y se invalidan una sola vez
 * por ráfaga (los temporizadores emiten muy seguido).
 *
 * Los blancos se declaran de dos formas:
 *
 *  - raíz semántica (`'dashboard'`, `'rooms'`, `'servicios'`), que coincide con la primera
 *    parte de la clave de React Query;
 *  - prefijo de ruta (`'/api/anticipos'`), que coincide con las consultas que usan la URL
 *    como clave (`useGenericFetch` sin `queryKey`), incluidas sus subrutas y query string.
 */

const EVENT_TARGETS: Record<string, readonly string[]> = {
  // ─── Pedidos ────────────────────────────────────────────────────────────────
  new_order: ['orders', '/api/orders', 'dashboard', 'notifications'],
  order_updated: ['orders', '/api/orders', 'dashboard', 'notifications'],
  order_deleted: ['orders', '/api/orders', 'dashboard', 'notifications'],

  // ─── Servicios y habitaciones ───────────────────────────────────────────────
  new_service_request: [
    'servicios',
    '/api/servicios',
    '/api/solicitudes-servicios',
    'rooms',
    '/api/rooms',
    '/api/cuentas',
    'dashboard',
    'notifications'
  ],
  service_request_processed: [
    'servicios',
    '/api/servicios',
    '/api/solicitudes-servicios',
    'notifications'
  ],
  service_request_deleted: [
    'servicios',
    '/api/servicios',
    '/api/solicitudes-servicios',
    'notifications'
  ],
  service_changed: [
    'servicios',
    '/api/servicios',
    'rooms',
    '/api/rooms',
    'timers',
    '/api/cuentas',
    'dashboard',
    'notifications'
  ],

  // ─── Temporizadores ─────────────────────────────────────────────────────────
  timers_updated: [
    'timers',
    'rooms',
    '/api/rooms',
    'servicios',
    '/api/servicios',
    '/api/cuentas',
    'dashboard'
  ],
  timer_started: [
    'timers',
    'rooms',
    '/api/rooms',
    'servicios',
    '/api/servicios',
    '/api/cuentas',
    'dashboard'
  ],
  timer_updated: [
    'timers',
    'rooms',
    '/api/rooms',
    'servicios',
    '/api/servicios',
    '/api/cuentas',
    'dashboard'
  ],
  timer_stopped: [
    'timers',
    'rooms',
    '/api/rooms',
    'servicios',
    '/api/servicios',
    '/api/cuentas',
    'dashboard'
  ],
  timer_warning_5m: ['/api/cuentas', 'notifications'],
  timer_ended_event: [
    'timers',
    'rooms',
    '/api/rooms',
    'servicios',
    '/api/servicios',
    'sales',
    '/api/sales',
    '/api/cuentas',
    'dashboard',
    'notifications'
  ],
  room_available: [
    'rooms',
    '/api/rooms',
    '/api/available-rooms',
    'servicios',
    '/api/servicios',
    '/api/cuentas',
    'dashboard'
  ],

  // ─── Ventas, caja y anulaciones ─────────────────────────────────────────────
  updateSales: [
    'sales',
    '/api/sales',
    'dashboard',
    'reports',
    '/api/reports',
    'cashRegister',
    '/api/cash-register',
    'commissions',
    '/api/commissions',
    'tips',
    '/api/tips',
    '/api/cuentas'
  ],
  sale_cancelled: [
    'sales',
    '/api/sales',
    'orders',
    '/api/orders',
    'servicios',
    '/api/servicios',
    'dashboard',
    'reports',
    '/api/reports',
    'cashRegister',
    '/api/cash-register',
    'commissions',
    '/api/commissions',
    'tips',
    '/api/tips'
  ],
  anulacion_processed: [
    'sales',
    '/api/sales',
    'servicios',
    '/api/servicios',
    'orders',
    '/api/orders',
    'dashboard',
    'cashRegister',
    '/api/cash-register',
    'commissions',
    '/api/commissions',
    'tips',
    '/api/tips',
    'notifications'
  ],

  // ─── Inventario, bar y bodega ───────────────────────────────────────────────
  categories_updated: ['products', '/api/products', 'categories', '/api/categories'],
  transfers_updated: ['/api/transfers', 'products', '/api/products', '/api/bar', 'dashboard'],
  bar_shot_alert: ['/api/bar', 'products', '/api/products', 'notifications'],
  warehouse_container_alert: [
    '/api/bar',
    '/api/products/containers',
    'products',
    '/api/products',
    'notifications'
  ],
  container_return_pending: [
    '/api/products/containers',
    'products',
    '/api/products',
    'notifications'
  ],
  cleaning_updated: ['/api/cleaning'],

  // ─── Personas: usuarios, clientes, roles y presencia ────────────────────────
  profile_updated: ['users', '/api/users', 'auth', '/api/users/profile'],
  presence_updated: [
    'anfitrionas',
    '/api/anfitrionas',
    '/api/users/status',
    'logged-users-stats',
    'dashboard'
  ],
  'permissions-updated': ['auth', 'users', '/api/users', 'roles', '/api/roles', '/api/permissions'],
  'role-deleted': ['roles', '/api/roles', 'users', '/api/users', 'auth'],
  force_logout: ['auth'],

  // ─── Asistencia ─────────────────────────────────────────────────────────────
  attendance_registered: [
    'attendance',
    '/api/attendance',
    'anfitrionas',
    '/api/users/status',
    'logged-users-stats',
    'dashboard',
    'notifications'
  ],
  attendance_duplicate: [
    'attendance',
    '/api/attendance',
    '/api/users/status',
    'logged-users-stats'
  ],
  check_attendance: ['attendance', '/api/attendance'],

  // ─── Caja: cierre ───────────────────────────────────────────────────────────
  cash_register_closed: ['cashRegister', '/api/cash-register', 'dashboard'],

  // ─── Personal: anticipos, gratificaciones y nómina ─────────────────────────
  ANTICIPO_PROCESSED: ['advances', '/api/anticipos', 'payroll', '/api/payroll', 'dashboard'],
  anticipo_processed: ['advances', '/api/anticipos', 'payroll', '/api/payroll', 'dashboard'],
  anticipo_delivered: [
    'advances',
    '/api/anticipos',
    'payroll',
    '/api/payroll',
    'cashRegister',
    '/api/cash-register',
    'dashboard'
  ],
  new_anticipo_request: ['advances', '/api/anticipos', 'notifications', 'dashboard'],
  new_gratificacion_request: [
    'gratifications',
    '/api/gratificaciones',
    'notifications',
    'dashboard'
  ],
  gratificacion_processed: [
    'gratifications',
    '/api/gratificaciones',
    'payroll',
    '/api/payroll',
    'dashboard'
  ],

  // ─── Avisos operativos ──────────────────────────────────────────────────────
  security_alert: ['notifications'],
  assistance_request: ['notifications'],
  staff_call_accepted: ['notifications']
};

/**
 * `resource_updated` es la señal genérica de `withRoute` (una mutación auditada y exitosa).
 * El módulo del catálogo de permisos identifica qué consultas hay que refrescar; cubre de
 * una sola vez el CRUD de administración (productos, clientes, usuarios, roles, etc.).
 */
const MODULE_TARGETS: Record<string, readonly string[]> = {
  roles: ['roles', '/api/roles', 'users', '/api/users', 'auth'],
  users: ['users', '/api/users', 'roles', '/api/roles'],
  sales: [
    'sales',
    '/api/sales',
    'reports',
    '/api/reports',
    'cashRegister',
    '/api/cash-register',
    'commissions',
    '/api/commissions',
    'tips',
    '/api/tips',
    'dashboard'
  ],
  products: ['products', '/api/products', 'categories', '/api/categories', 'dashboard'],
  clients: ['clients', '/api/clients'],
  finances: [
    'advances',
    '/api/anticipos',
    'payroll',
    '/api/payroll',
    'cashRegister',
    '/api/cash-register',
    'dashboard'
  ],
  reports: ['reports', '/api/reports'],
  settings: ['/api/configurations', '/api/settings', 'dashboard'],
  orders: ['orders', '/api/orders', 'dashboard'],
  advances: [
    'advances',
    '/api/anticipos',
    'payroll',
    '/api/payroll',
    'cashRegister',
    '/api/cash-register',
    'dashboard'
  ],
  commissions: ['commissions', '/api/commissions', 'payroll', '/api/payroll', 'dashboard'],
  payroll: ['payroll', '/api/payroll', 'cashRegister', '/api/cash-register', 'dashboard'],
  rooms: ['rooms', '/api/rooms', 'dashboard'],
  attendance: [
    'attendance',
    '/api/attendance',
    'anfitrionas',
    '/api/users/status',
    'logged-users-stats',
    'dashboard'
  ],
  overtime: ['/api/overtime', 'payroll', '/api/payroll'],
  tips: ['tips', '/api/tips', 'dashboard'],
  gratificaciones: [
    'gratifications',
    '/api/gratificaciones',
    'payroll',
    '/api/payroll',
    'dashboard'
  ],
  accounts: ['/api/cuentas', '/api/accounts', 'dashboard'],
  categories: ['categories', '/api/categories', 'products', '/api/products'],
  returns: ['returns', '/api/returns', 'products', '/api/products', 'dashboard'],
  private_rooms: [
    'servicios',
    '/api/servicios',
    'rooms',
    '/api/rooms',
    '/api/cuentas',
    'dashboard'
  ],
  dashboard: ['dashboard']
};

function matchesTarget(queryKey: readonly unknown[], targets: readonly string[]): boolean {
  const root = queryKey[0];
  if (typeof root !== 'string') return false;

  return targets.some(target => {
    if (!target.startsWith('/')) return root === target;
    return root === target || root.startsWith(`${target}?`) || root.startsWith(`${target}/`);
  });
}

export function useRealtimeInvalidation(): void {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  const pending = useRef<Set<string>>(new Set());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    flushTimer.current = null;
    if (pending.current.size === 0) return;
    const targets = Array.from(pending.current);
    pending.current.clear();
    queryClient.invalidateQueries({ predicate: query => matchesTarget(query.queryKey, targets) });
  }, [queryClient]);

  const schedule = useCallback(
    (targets: readonly string[]) => {
      for (const target of targets) pending.current.add(target);
      // Una ráfaga de eventos (temporizadores) se resuelve con una sola invalidación.
      if (flushTimer.current) return;
      flushTimer.current = setTimeout(flush, 250);
    },
    [flush]
  );

  useEffect(
    () => () => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        flushTimer.current = null;
      }
      pending.current.clear();
    },
    []
  );

  const sseUrl = user ? '/api/notifications/sse' : null;

  useSharedSSE(sseUrl, payload => {
    if (typeof payload?.type !== 'string') return;

    if (payload.type === 'resource_updated') {
      const moduleKey = payload?.data?.module;
      const targets = typeof moduleKey === 'string' ? MODULE_TARGETS[moduleKey] : undefined;
      if (targets) schedule(targets);
      return;
    }

    const targets = EVENT_TARGETS[payload.type];
    if (targets) schedule(targets);
  });
}
