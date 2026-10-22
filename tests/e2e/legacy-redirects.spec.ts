import { LEGACY_ROUTE_REDIRECTS, legacyRedirectTarget } from '@/lib/constants/legacy-routes';
import { expect, loginAsAdmin, requireAdmin, test } from './fixtures/admin';

// La PWA puede servir una página cacheada; estas pruebas deben hablar con el servidor.
test.use({ serviceWorkers: 'block' });

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';

function destinoDe(location: string | undefined): string | null {
  if (!location) return null;
  return new URL(location, BASE).pathname;
}

test.describe('redirects legacy', () => {
  test('cada URL retirada responde 308 antes de mirar sesión o permisos', async ({ request }) => {
    test.setTimeout(120_000);

    const fallos: string[] = [];
    for (const [origen, destino] of Object.entries(LEGACY_ROUTE_REDIRECTS)) {
      const response = await request.get(`${BASE}${origen}`, { maxRedirects: 0 });
      const location = destinoDe(response.headers()['location']);

      if (response.status() !== 308 || location !== destino) {
        fallos.push(
          `${origen}: esperado 308 → ${destino}, recibido ${response.status()} → ${
            location ?? '(sin Location)'
          }`
        );
      }
    }

    expect(fallos, `Redirects incorrectos:\n${fallos.join('\n')}`).toHaveLength(0);
  });

  test('conserva las subrutas y traduce los segmentos internos', async ({ request }) => {
    const casos = [
      ['/colaciones/12', '/meals/12'],
      ['/api/cuentas/7/cobrar', '/api/accounts/7/charge'],
      ['/api/cuentas/7/cobrar-con-venta', '/api/accounts/7/charge-with-sale'],
      ['/api/cuentas/anulacion', '/api/accounts/cancellation'],
      ['/api/anticipos/aprobar', '/api/advances/approve'],
      ['/api/attendance/hoy', '/api/attendance/today'],
      ['/api/biometric/records/42/foto', '/api/biometric/records/42/photo'],
      ['/api/cash-register/ventas-barras', '/api/cash-register/bar-sales'],
      ['/api/cashregister/cierre', '/api/cashregister/closing'],
      ['/api/clients/prepago', '/api/clients/prepaid'],
      ['/api/codigo/actual', '/api/code/current'],
      ['/api/gratifications/aprobar', '/api/gratifications/approve'],
      ['/api/anfitrionas/disponibles', '/api/hostesses/available'],
      ['/api/meals/regla', '/api/meals/rule'],
      ['/api/mcp/solicitudes', '/api/mcp/requests'],
      ['/api/permissions/setup-cajero', '/api/permissions/setup-cashier'],
      ['/api/ventas/solicitud-anulacion', '/api/sales/cancellation-request'],
      ['/api/solicitudes-servicios/9/aprobar', '/api/service-requests/9/approve'],
      ['/api/services/9/anfitrionas', '/api/services/9/hostesses'],
      ['/api/services/temporal', '/api/services/temporary'],
      ['/api/users/9/verificar', '/api/users/9/verify']
    ] as const;

    for (const [origen, destino] of casos) {
      // La tabla y el proxy deben resolver la misma ruta; si cambia una regla,
      // el caso de arriba deja de representar la URL real y este guardia falla.
      expect(legacyRedirectTarget(origen)).toBe(destino);

      const response = await request.get(`${BASE}${origen}`, { maxRedirects: 0 });
      expect(
        `${response.status()} → ${destinoDe(response.headers()['location']) ?? '(sin Location)'}`,
        `${origen} no llegó a ${destino}`
      ).toBe(`308 → ${destino}`);
    }
  });

  test('un enlace legacy protegido encadena al login con el destino nuevo', async ({ page }) => {
    await page.goto(`${BASE}/colaciones`, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
    const url = new URL(page.url());
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('redirect')).toBe('/meals');
  });
});

test.describe('destinos del sidebar', () => {
  test('todos cargan sin terminar en login, access-denied ni 404', async ({ page, admin }) => {
    test.setTimeout(240_000);

    await loginAsAdmin(page, requireAdmin(admin));

    if (new URL(page.url()).pathname === '/change-password') {
      test.skip(true, 'La cuenta de prueba exige cambiar la contraseña');
    }

    const nav = page.getByRole('navigation', { name: 'Menú principal' });
    await expect(nav).toBeVisible({ timeout: 20_000 });

    const hrefs = await nav
      .locator('a[href^="/"]')
      .evaluateAll(nodes =>
        Array.from(
          new Set(
            nodes
              .map(node => node.getAttribute('href'))
              .filter((href): href is string => Boolean(href))
          )
        )
      );

    expect(hrefs.length, 'El sidebar del administrador no expuso destinos').toBeGreaterThan(20);

    const fallos: string[] = [];
    for (const href of hrefs) {
      const response = await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded' });

      // Los paneles cargan datos en el cliente; si el guard de ruta va a rebotar,
      // lo hace después de la hidratación.
      await page.waitForTimeout(1_000);

      const finalUrl = new URL(page.url());
      const title = await page.title().catch(() => '');
      const notFoundHeading = await page
        .getByRole('heading', {
          name: /página no encontrada|page not found|could not be found/i
        })
        .count()
        .catch(() => 0);

      const motivo =
        finalUrl.pathname === '/login' || finalUrl.pathname.startsWith('/login/')
          ? 'terminó en login'
          : finalUrl.pathname.startsWith('/access-denied')
            ? 'terminó en access-denied'
            : finalUrl.pathname !== href && !finalUrl.pathname.startsWith(`${href}/`)
              ? `quedó en ${finalUrl.pathname}`
              : response?.status() === 404
                ? 'respondió 404'
                : finalUrl.pathname === '/404' || finalUrl.pathname === '/_not-found'
                  ? 'terminó en la página 404'
                  : /could not be found|página no encontrada/i.test(title)
                    ? `título de 404: ${title}`
                    : notFoundHeading > 0
                      ? 'encabezado de 404'
                      : null;

      if (motivo) fallos.push(`${href}: ${motivo} (${finalUrl.pathname})`);
    }

    expect(fallos, `Destinos del sidebar con problemas:\n${fallos.join('\n')}`).toHaveLength(0);
  });
});
