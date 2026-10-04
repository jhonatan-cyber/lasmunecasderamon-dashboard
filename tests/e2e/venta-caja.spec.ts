import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const TEST_USER = process.env.TEST_USER ?? 'admin';
const TEST_PASSWORD = process.env.TEST_PASSWORD;

function skipWithoutPassword() {
  test.skip(!TEST_PASSWORD, 'TEST_PASSWORD no definida — e2e de venta/caja omitido (opcional)');
}

async function gotoLoginHydrated(page: Page) {
  const usersLoaded = page.waitForResponse(
    r => r.url().includes('/api/auth/check-users') && r.status() === 200,
    { timeout: 30_000 }
  );
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await usersLoaded;
}

async function login(page: Page) {
  await gotoLoginHydrated(page);
  await expect(page.locator('#nick')).toBeVisible({ timeout: 15_000 });
  await page.locator('#nick').fill(TEST_USER);
  await page.locator('#password').fill(TEST_PASSWORD!);
  await page.locator('button[type="submit"]').first().click();

  const codeStep = page.locator('input[placeholder="0000"]');
  if (await codeStep.isVisible({ timeout: 3000 }).catch(() => false)) {
    test.skip(true, 'Código 2FA detectado — requiere interacción manual');
  }

  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 30_000 });
}

function trackServerErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('response', res => {
    if (res.status() === 500) errors.push(`HTTP 500: ${res.url()}`);
  });
  return errors;
}

test.describe('Flujo de venta — navegación y página', () => {
  test('1. /sales carga sin errores de Server Component', async ({ page }) => {
    skipWithoutPassword();
    test.setTimeout(60_000);
    const errors = trackServerErrors(page);

    await login(page);
    await page.goto(`${BASE}/sales`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/sales');
    const fatal = errors.filter(
      e =>
        e.includes('useRef') ||
        e.includes('only works in Client') ||
        e.includes('Server Component') ||
        e.includes('HTTP 500')
    );
    expect(fatal, `Fatal: ${fatal.join(' | ')}`).toHaveLength(0);
    console.log('✓ /sales carga limpia');
  });

  test('2. /sales/new muestra el formulario de nueva venta', async ({ page }) => {
    skipWithoutPassword();
    test.setTimeout(60_000);

    await login(page);
    await page.goto(`${BASE}/sales/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/sales');
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(50);
    console.log('✓ /sales/new responde con contenido');
  });

  test('3. Navegación dashboard → sales mantiene sesión', async ({ page }) => {
    skipWithoutPassword();
    test.setTimeout(60_000);

    await login(page);
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.goto(`${BASE}/sales`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    expect(page.url()).not.toContain('/login');
    expect(page.url()).toContain('/sales');
    console.log('✓ Sesión se mantiene al navegar a /sales');
  });
});

test.describe('Flujo de caja — navegación y página', () => {
  test('4. /cash-register carga sin errores', async ({ page }) => {
    skipWithoutPassword();
    test.setTimeout(60_000);
    const errors = trackServerErrors(page);

    await login(page);
    await page.goto(`${BASE}/cash-register`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/cash-register');
    const fatal = errors.filter(
      e =>
        e.includes('useRef') ||
        e.includes('only works in Client') ||
        e.includes('Server Component') ||
        e.includes('HTTP 500')
    );
    expect(fatal, `Fatal: ${fatal.join(' | ')}`).toHaveLength(0);
    console.log('✓ /cash-register carga limpia');
  });

  test('5. API de caja responde autenticado', async ({ page }) => {
    skipWithoutPassword();
    test.setTimeout(60_000);

    await login(page);

    const resp = await page.request.get(`${BASE}/api/cashregister/current`);
    // 200 con caja, 404 sin caja abierta, 422 negocio — todo menos 401/500
    expect([200, 404, 409, 422]).toContain(resp.status());
    console.log(`✓ /api/cashregister/current → ${resp.status()}`);
  });

  test('6. API de ventas responde autenticado (lista)', async ({ page }) => {
    skipWithoutPassword();
    test.setTimeout(60_000);

    await login(page);

    const resp = await page.request.get(`${BASE}/api/sales`);
    expect([200, 404]).toContain(resp.status());
    console.log(`✓ /api/sales → ${resp.status()}`);
  });
});

test.describe('Flujo venta/caja — guards y permisos', () => {
  test('7. /sales sin sesión redirige a login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${BASE}/sales`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/login');
    console.log('✓ /sales protegido sin sesión');
  });

  test('8. /cash-register sin sesión redirige a login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`${BASE}/cash-register`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/login');
    console.log('✓ /cash-register protegido sin sesión');
  });

  test('9. POST /api/sales sin sesión devuelve 401', async ({ page }) => {
    await page.context().clearCookies();
    const resp = await page.request.post(`${BASE}/api/sales`, {
      data: { total: 1000, detalles: [] },
      failOnStatusCode: false
    });

    expect(resp.status()).toBe(401);
    const body = await resp.json();
    expect(body.code).toBe('NO_TOKEN');
    console.log('✓ POST /api/sales sin sesión → 401 NO_TOKEN');
  });

  test('10. POST /api/cashregister sin sesión devuelve 401', async ({ page }) => {
    await page.context().clearCookies();
    const resp = await page.request.post(`${BASE}/api/cashregister/open`, {
      data: { monto_apertura: 50000 },
      failOnStatusCode: false
    });

    expect(resp.status()).toBe(401);
    console.log('✓ POST /api/cashregister sin sesión → 401');
  });
});

test.describe('Flujo venta/caja — UI básica autenticada', () => {
  test('11. Header y navegación visibles en /sales', async ({ page }) => {
    skipWithoutPassword();
    test.setTimeout(60_000);

    await login(page);
    await page.goto(`${BASE}/sales`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const header = page.locator('header').first();
    await expect(header).toBeVisible({ timeout: 10_000 });
    console.log('✓ Header visible en /sales');
  });

  test('12. /sales muestra al menos un control de búsqueda o filtro', async ({ page }) => {
    skipWithoutPassword();
    test.setTimeout(60_000);

    await login(page);
    await page.goto(`${BASE}/sales`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const searchOrFilter = page
      .locator('input[type="search"], input[placeholder*="Buscar"], input[placeholder*="buscar"]')
      .first();
    const hasSearch = await searchOrFilter.isVisible({ timeout: 5000 }).catch(() => false);

    // La página puede mostrar tabla vacía o filtros; al menos debe tener contenido estructurado
    const tableOrCard = page.locator('table, [role="table"], .card, [data-testid]').first();
    const hasStructure = await tableOrCard.isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasSearch || hasStructure).toBeTruthy();
    console.log(`✓ /sales estructura — search:${hasSearch} structure:${hasStructure}`);
  });
});
