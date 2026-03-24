import { expect, Page, test } from '@playwright/test';
import jwt from 'jsonwebtoken';

type Role = 'administrador' | 'cajero' | 'garzon' | 'anfitriona';

type MockOptions = {
  role?: Role;
  requiresCode?: boolean;
  authenticated?: boolean;
  salesData?: Array<Record<string, unknown>>;
  salesStats?: { total_ventas: number; promedio_venta: number };
  cuentasData?: Array<Record<string, unknown>>;
  cashOpen?: boolean;
};

type MockUser = {
  id: number;
  name: string;
  lastName: string;
  email: string;
  role: Role;
  status: number;
  username: string;
  qr_token?: string;
};

const users: Record<Role, MockUser> = {
  administrador: {
    id: 1,
    name: 'Ada',
    lastName: 'Admin',
    email: 'ada@lasmunecasderamon.com',
    role: 'administrador',
    status: 1,
    username: 'ada.admin',
    qr_token: 'ADMIN-QR-001',
  },
  cajero: {
    id: 2,
    name: 'Carla',
    lastName: 'Caja',
    email: 'carla@lasmunecasderamon.com',
    role: 'cajero',
    status: 1,
    username: 'carla.caja',
    qr_token: 'CAJA-QR-002',
  },
  garzon: {
    id: 3,
    name: 'Gaston',
    lastName: 'Garzon',
    email: 'gaston@lasmunecasderamon.com',
    role: 'garzon',
    status: 1,
    username: 'gaston.garzon',
    qr_token: 'GARZON-QR-003',
  },
  anfitriona: {
    id: 4,
    name: 'Ana',
    lastName: 'Host',
    email: 'ana@lasmunecasderamon.com',
    role: 'anfitriona',
    status: 1,
    username: 'ana.host',
    qr_token: 'HOST-QR-004',
  },
};

const employeePermissions = [
  { id: 1, name: 'Dashboard view', description: 'view dashboard', module: 'dashboard', action: 'view' },
];

const jwtSecret = process.env.JWT_SECRET ?? '***REMOVED***';
const testBaseUrl = 'http://127.0.0.1:3100';

async function mockWebApis(page: Page, options: MockOptions = {}) {
  const role = options.role ?? 'administrador';
  const user = users[role];
  const authenticated = options.authenticated ?? true;
  const requiresCode = options.requiresCode ?? false;
  const salesData = options.salesData ?? [];
  const salesStats = options.salesStats ?? { total_ventas: 0, promedio_venta: 0 };
  const cuentasData = options.cuentasData ?? [];
  const cashOpen = options.cashOpen ?? true;
  await page.addInitScript(
    ({
      mockedUser,
      mockedAuthenticated,
      mockedRequiresCode,
      mockedSalesData,
      mockedSalesStats,
      mockedCuentasData,
      mockedCashOpen,
      mockedRole,
      mockedToken,
      mockedEmployeePermissions,
    }) => {
      const originalFetch = window.fetch.bind(window);

      const jsonResponse = (data: unknown, status = 200) =>
        new Response(JSON.stringify(data), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });

      class MockEventSource {
        onmessage: ((event: MessageEvent) => void) | null = null;
        onerror: (() => void) | null = null;

        constructor() {
          window.setTimeout(() => {
            this.onmessage?.({ data: JSON.stringify({ type: 'ping' }) } as MessageEvent);
          }, 10);
        }

        addEventListener(type: string, handler: (event: MessageEvent) => void) {
          if (type === 'message') {
            this.onmessage = handler;
          }
        }

        close() {}
      }

      // @ts-expect-error test shim
      window.EventSource = MockEventSource;

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const requestUrl =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        const url = new URL(requestUrl, window.location.origin);
        const path = url.pathname;
        const method =
          init?.method ??
          (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET');

        if (!path.startsWith('/api/')) {
          return originalFetch(input, init);
        }

        if (path === '/api/login' && method === 'POST') {
          const body = init?.body ? JSON.parse(String(init.body)) : {};

          if (mockedRequiresCode && !body.codigo) {
            return jsonResponse({ requiereCodigo: true, user: mockedUser });
          }

          document.cookie = `token=${mockedToken}; path=/; SameSite=Lax`;
          return jsonResponse({ success: true, user: mockedUser });
        }

        if (path === '/api/auth/check-users') {
          return jsonResponse({ success: true, hasUsers: true });
        }

        if (path === '/api/auth/check') {
          return jsonResponse(mockedAuthenticated ? { success: true } : { success: false });
        }

        if (path === '/api/auth/me') {
          return jsonResponse(
            mockedAuthenticated
              ? { success: true, user: mockedUser }
              : { success: false, message: 'Unauthorized' },
            mockedAuthenticated ? 200 : 401
          );
        }

        if (path === `/api/users/${mockedUser.id}/permissions`) {
          return jsonResponse({
            success: true,
            data: mockedRole === 'administrador' ? [] : mockedEmployeePermissions,
          });
        }

        if (path === `/api/users/${mockedUser.id}`) {
          return jsonResponse({ success: true, user: mockedUser });
        }

        if (path === '/api/cashregister/status') {
          return jsonResponse({
            success: true,
            data: {
              hasOpenCaja: mockedCashOpen,
              cajaInfo: mockedCashOpen
                ? {
                    id_caja: 99,
                    usuario_id_apertura: mockedUser.id,
                    fecha_apertura: '2026-03-17T21:00:00.000Z',
                  }
                : null,
            },
          });
        }

        if (path === '/api/cashregister') {
          return jsonResponse({ success: true, data: [] });
        }

        if (path === '/api/codigo/actual') {
          return jsonResponse({ success: true, codigo: '1234' });
        }

        if (
          path === '/api/asistencias/user' ||
          path === '/api/anticipos/user' ||
          path === '/api/tips/user' ||
          path === '/api/overtime/user' ||
          path === '/api/orders/user' ||
          path === '/api/commissions/user' ||
          path === '/api/servicios/user' ||
          path === '/api/users/logged' ||
          path === '/api/users/logged-count' ||
          path === '/api/sales/chart' ||
          path === '/api/sales/weekly' ||
          path === '/api/habitaciones'
        ) {
          return jsonResponse({ success: true, data: [] });
        }

        if (path === '/api/sales/stats') {
          return jsonResponse(mockedSalesStats);
        }

        if (path === '/api/sales') {
          if (url.searchParams.get('tipo') === 'resumen') {
            const total = mockedSalesData.reduce(
              (sum: number, sale: Record<string, unknown>) => sum + Number(sale.total ?? 0),
              0
            );
            return jsonResponse({
              success: true,
              data: { total_ventas: mockedSalesData.length, total_ingresos: total },
            });
          }

          return jsonResponse({ success: true, data: mockedSalesData });
        }

        if (path === '/api/cuentas') {
          return jsonResponse(mockedCuentasData);
        }

        if (path === '/api/dashboard/stats' || path === '/api/stats/dashboard') {
          return jsonResponse({
            success: true,
            data: { totalSales: 12, totalUsers: 8, totalClients: 4, totalRevenue: 120000 },
          });
        }

        return jsonResponse({ success: true, data: [] });
      };
    },
    {
      mockedUser: user,
      mockedAuthenticated: authenticated,
      mockedRequiresCode: requiresCode,
      mockedSalesData: salesData,
      mockedSalesStats: salesStats,
      mockedCuentasData: cuentasData,
      mockedCashOpen: cashOpen,
      mockedRole: role,
      mockedToken: createToken(role),
      mockedEmployeePermissions: employeePermissions,
    }
  );
}

function createToken(role: Role) {
  const user = users[role];
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
    },
    jwtSecret
  );
}

async function seedSessionCookie(page: Page, role: Role) {
  await page.context().addCookies([
    {
      name: 'token',
      value: createToken(role),
      url: testBaseUrl,
      sameSite: 'Lax',
    },
  ]);
}

test.describe('public and auth flows', () => {
  test('landing renders primary content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('link', { name: /Saltar al contenido principal/i })).toBeAttached();
    await expect(page.getByRole('navigation', { name: /Navegacion principal/i })).toBeVisible();
  });

  test('privacy page remains accessible', async ({ page }) => {
    await page.goto('/politica-de-privacidad');

    await expect(page.getByRole('heading', { name: /Politica de Privacidad/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Volver al Inicio/i })).toBeVisible();
  });

  test('protected dashboard redirects unauthenticated users to login', async ({ page }) => {
    await mockWebApis(page, { authenticated: false });

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login\?redirect=/);
    await expect(page.getByRole('heading', { name: /Iniciar sesi[oó]n/i })).toBeVisible();
  });

  test('login renders authentication form', async ({ page }) => {
    await mockWebApis(page, { authenticated: false });

    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /Iniciar sesi[oó]n/i })).toBeVisible();
    await expect(page.getByPlaceholder(/admin, pepe, lizi/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Contrase/i)).toBeVisible();
  });

  test('login submits successfully for admin and lands on dashboard', async ({ page }) => {
    await mockWebApis(page, { role: 'administrador', authenticated: true });

    await page.goto('/login');
    await page.getByPlaceholder(/admin, pepe, lizi/i).fill('ada.admin');
    await page.getByPlaceholder(/Contrase/i).fill('secret123');
    await page.getByRole('button', { name: /^Iniciar sesi[oó]n$/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /^Dashboard$/i })).toBeVisible();
    await expect(page.getByText(/Bienvenido al panel de administraci[oó]n/i)).toBeVisible();
  });

  test('two-step login shows code verification step before entering', async ({ page }) => {
    await mockWebApis(page, { role: 'garzon', authenticated: true, requiresCode: true });

    await page.goto('/login');
    await page.getByPlaceholder(/admin, pepe, lizi/i).fill('gaston.garzon');
    await page.getByPlaceholder(/Contrase/i).fill('secret123');
    await page.getByRole('button', { name: /^Iniciar sesi[oó]n$/i }).click();

    await expect(page.getByRole('heading', { name: /^Verificaci[oó]n$/i })).toBeVisible();
    await page.getByPlaceholder('0000').fill('1234');
    await page.getByRole('button', { name: /Verificar C[oó]digo/i }).click();

    await expect(page).toHaveURL(/\/(dashboard|garzon-dashboard)$/);
  });
});

test.describe('role dashboards', () => {
  test('admin remains on the main dashboard', async ({ page }) => {
    await mockWebApis(page, { role: 'administrador' });
    await seedSessionCookie(page, 'administrador');

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /^Dashboard$/i })).toBeVisible();
    await expect(page.getByText(/Mi Registro de Asistencia/i)).toBeVisible();
  });

  test('garzon users are redirected to their dedicated dashboard', async ({ page }) => {
    await mockWebApis(page, { role: 'garzon' });
    await seedSessionCookie(page, 'garzon');

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/garzon-dashboard$/);
    await expect(page.getByText(/Panel de control para garzones/i)).toBeVisible();
    await expect(page.getByText(/TOTAL A COBRAR/i)).toBeVisible();
    await expect(page.getByText(/^Pedidos$/i)).toBeVisible();
  });

  test('anfitriona users are redirected to their dedicated dashboard', async ({ page }) => {
    await mockWebApis(page, { role: 'anfitriona' });
    await seedSessionCookie(page, 'anfitriona');

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/anfitriona-dashboard$/);
    await expect(page.getByText(/Panel de control para anfitrionas/i)).toBeVisible();
    await expect(page.getByText(/TOTAL A COBRAR/i)).toBeVisible();
    await expect(page.getByText(/^Servicios$/i)).toBeVisible();
  });
});

test.describe('business modules', () => {
  test('accounts page surfaces closed cash-register state and loaded accounts', async ({ page }) => {
    await mockWebApis(page, {
      role: 'administrador',
      cashOpen: false,
      cuentasData: [
        {
          id_cuenta: 101,
          codigo: 'CTA-101',
          estado: 1,
          cliente_nombre: 'Cliente Demo',
          cliente_id: 1,
          habitacion_numero: 'VIP-7',
          habitacion_id: 7,
          sub_total: 120000,
          total_comision: 30000,
          total: 150000,
          fecha_crea: '2026-03-17T22:00:00.000Z',
        },
      ],
    });
    await seedSessionCookie(page, 'administrador');

    await page.goto('/accounts');

    await expect(page.getByRole('heading', { name: /^Cuentas$/i })).toBeVisible();
    await expect(page.getByText(/Caja cerrada/i)).toBeVisible();
    await expect(page.getByRole('cell', { name: /CTA-101/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: /Cliente Demo/i })).toBeVisible();
  });

  test('sales page shows empty-state guidance when there are no sales', async ({ page }) => {
    await mockWebApis(page, {
      role: 'administrador',
      salesData: [],
      salesStats: { total_ventas: 0, promedio_venta: 0 },
    });
    await seedSessionCookie(page, 'administrador');

    await page.goto('/sales');

    await expect(page.getByRole('heading', { name: /^Ventas$/i })).toBeVisible();
    await expect(page.getByText(/No hay ventas registradas/i)).toBeVisible();
    await expect(page.getByText(/Las ventas aparecer[aá]n aqu[ií] cuando se registren/i)).toBeVisible();
  });

  test('sales page renders sales data and supports business search filtering', async ({ page }) => {
    await mockWebApis(page, {
      role: 'administrador',
      salesStats: { total_ventas: 1, promedio_venta: 85000 },
      salesData: [
        {
          id: 501,
          codigo: 'VTA-501',
          estado: 1,
          metodo_pago: 'efectivo',
          cliente_nombre: 'Carlos Cliente',
          habitacion_nombre: 'Habitacion 3',
          usuarios: [{ id: 1, nick: 'Luna' }],
          fecha_crea: '2026-03-17T23:00:00.000Z',
          total: 85000,
          propina: 5000,
          detalles: [{ id_detalle: 1 }],
        },
      ],
    });
    await seedSessionCookie(page, 'administrador');

    await page.goto('/sales');

    await expect(page.getByText(/VTA-501/i)).toBeVisible();
    await expect(page.getByText(/Carlos Cliente/i)).toBeVisible();
    await expect(page.getByText(/Habitacion 3/i)).toBeVisible();

    await page.getByPlaceholder(/Buscar por c[oó]digo, cliente, habitaci[oó]n o anfitriona/i).fill('sin-coincidencia');

    await expect(page.getByText(/No se encontraron ventas/i)).toBeVisible();
    await expect(page.getByText(/Intenta ajustar los filtros de b[uú]squeda/i)).toBeVisible();
  });
});
