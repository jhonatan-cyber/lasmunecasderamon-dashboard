import { INVENTORY_QUERY_TARGETS } from './inventoryQueries';

const EVENT_TARGETS: Record<string, readonly string[]> = {
  stock_replenishment: ['notifications', '/api/notifications', '/api/purchases', 'dashboard'],
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
    '/api/cashregister',
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
    '/api/cashregister',
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
    '/api/cashregister',
    'commissions',
    '/api/commissions',
    'tips',
    '/api/tips',
    'notifications'
  ],

  // ─── Inventario, bar y bodega ───────────────────────────────────────────────
  categories_updated: INVENTORY_QUERY_TARGETS,
  transfers_updated: INVENTORY_QUERY_TARGETS,
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
  cash_register_closed: ['cashRegister', '/api/cashregister', 'dashboard'],

  // ─── Personal: anticipos, gratificaciones y nómina ─────────────────────────
  ANTICIPO_PROCESSED: ['advances', '/api/anticipos', 'payroll', '/api/payroll', 'dashboard'],
  anticipo_processed: ['advances', '/api/anticipos', 'payroll', '/api/payroll', 'dashboard'],
  anticipo_delivered: [
    'advances',
    '/api/anticipos',
    'payroll',
    '/api/payroll',
    'cashRegister',
    '/api/cashregister',
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
  users: [
    'users',
    '/api/users',
    'employees',
    'anfitrionas',
    '/api/anfitrionas',
    'logged-users-stats',
    'dashboard',
    'roles',
    '/api/roles'
  ],
  sales: [
    'sales',
    '/api/sales',
    'reports',
    '/api/reports',
    'cashRegister',
    '/api/cashregister',
    'commissions',
    '/api/commissions',
    'tips',
    '/api/tips',
    'dashboard'
  ],
  products: INVENTORY_QUERY_TARGETS,
  clients: ['clients', '/api/clients'],
  finances: [
    'advances',
    '/api/anticipos',
    'payroll',
    '/api/payroll',
    'cashRegister',
    '/api/cashregister',
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
    '/api/cashregister',
    'dashboard'
  ],
  commissions: ['commissions', '/api/commissions', 'payroll', '/api/payroll', 'dashboard'],
  payroll: ['payroll', '/api/payroll', 'cashRegister', '/api/cashregister', 'dashboard'],
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
  categories: INVENTORY_QUERY_TARGETS,
  returns: [
    'returns',
    '/api/returns',
    ...INVENTORY_QUERY_TARGETS,
    'sales',
    '/api/sales',
    'orders',
    '/api/orders',
    'servicios',
    '/api/servicios',
    'cuentas',
    '/api/cuentas'
  ],
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

export function matchesTarget(queryKey: readonly unknown[], targets: readonly string[]): boolean {
  const root = queryKey[0];
  if (typeof root !== 'string') return false;

  return targets.some(target => {
    if (!target.startsWith('/')) return root === target;
    return root === target || root.startsWith(`${target}?`) || root.startsWith(`${target}/`);
  });
}

const PRESENCE_TARGETS = [
  'users',
  '/api/users',
  'employees',
  'anfitrionas',
  '/api/anfitrionas',
  'logged-users-stats',
  '/api/stats/logged-users',
  'dashboard'
] as const;
const ATTENDANCE_TARGETS = [
  'attendance',
  '/api/attendance',
  'payroll',
  '/api/payroll',
  ...PRESENCE_TARGETS
] as const;
const SALES_EVENTS = new Set([
  'updateSales',
  'sale_cancelled',
  'anulacion_processed',
  'timer_ended_event'
]);

export function realtimeTargets(payload: {
  type?: string;
  data?: { module?: string; motivo?: string };
}): readonly string[] {
  const type = payload.type ?? '';
  const moduleKey = type === 'resource_updated' ? payload.data?.module : undefined;
  const targets = moduleKey ? (MODULE_TARGETS[moduleKey] ?? []) : (EVENT_TARGETS[type] ?? []);
  const extra: string[] = [];
  if (
    [
      'presence_updated',
      'attendance_registered',
      'attendance_duplicate',
      'check_attendance',
      'cash_register_closed'
    ].includes(type) ||
    moduleKey === 'attendance'
  ) {
    extra.push(...ATTENDANCE_TARGETS);
  }
  if (
    SALES_EVENTS.has(type) ||
    ['new_order', 'order_updated', 'order_deleted'].includes(type) ||
    moduleKey === 'sales' ||
    moduleKey === 'orders'
  ) {
    extra.push(...INVENTORY_QUERY_TARGETS, 'cuentas', '/api/cuentas');
  }
  if (moduleKey === 'payroll' || moduleKey === 'finances')
    extra.push(...ATTENDANCE_TARGETS, 'tips', '/api/tips', 'commissions', '/api/commissions');
  if (moduleKey === 'accounts' || moduleKey === 'private_rooms') extra.push('cuentas');
  if (moduleKey === 'settings') extra.push(...ATTENDANCE_TARGETS, 'configurations');
  if (type === 'presence_updated' && payload.data?.motivo === 'cierre_caja')
    extra.push('cashRegister', '/api/cashregister', '/api/caja', 'tips', '/api/tips');
  if (targets.includes('/api/cashregister')) extra.push('/api/caja');
  return [...new Set([...targets, ...extra])];
}
