const { chromium, expect } = require('@playwright/test');
const path = require('node:path');
const base = 'http://localhost:8081';
const stock = [
  { id: 'p1', producto_id: 'ron', producto_nombre: 'Ron de prueba', nombre: '750 ml', categoria_nombre: 'Licores', precio_venta: 20000, comision: 2000, stock: 4, stock_bar: 4, opciones_venta: [{ tipo: 'botella', precio: 20000, comision: 2000, precio_sin_anfitriona: 12000, vender_con_anfitriona: true }, { tipo: 'shot', precio: 4000 }] },
  { id: 'p2', producto_id: 'agua', producto_nombre: 'Agua de prueba', nombre: '350 ml', categoria_nombre: 'Bebidas', precio_venta: 2000, comision: 0, stock: 5, stock_bar: 5, opciones_venta: [{ tipo: 'botella', precio: 2000, precio_sin_anfitriona: 2000, vender_con_anfitriona: false }] }
];
const rooms = [0, 1, 2].map(estado => ({ id: `r${estado}`, id_habitacion: `r${estado}`, nombre: `VIP prueba ${estado}`, estado, precio: 30000, tiempo: 60, precio_habitacion: 30000, comision_anfitriona: 0 }));
const registros = [{ id: 1, usuario_nombre: 'Garzon de prueba', rol: 'garzon', producto_nombre: 'Agua', registrado_por_nombre: 'Caja', ml_bebida: 350, fecha_crea: '2026-11-12T20:00:00Z' }, { id: 2, usuario_nombre: 'Anfitriona de prueba', rol: 'anfitriona', producto_nombre: 'Corto', registrado_por_nombre: 'Caja', ml_bebida: 50, fecha_crea: '2026-11-12T20:00:00Z' }];
const rule = { endpointCatalogo: '/products/for-sale', categoriaBebidasAnalcoholicas: 'Bebidas analcoholicas', catalogos: { productos: { parametroCatalogo: 'solo_colacion', categoriaSistema: null }, analcoholicas: { parametroCatalogo: 'solo_analcoholicas', categoriaSistema: 'Bebidas analcoholicas' } }, roles: { anfitriona: { catalogo: 'productos' }, cajero: { catalogo: 'analcoholicas' }, garzon: { catalogo: 'analcoholicas' }, barman: { catalogo: 'analcoholicas' } } };
(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const consoleErrors = [];
  const requests = [];
  async function session(role, viewport = { width: 390, height: 844 }) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    const user = { id: 'ui-test', name: 'Prueba', lastName: 'Local', nick: 'prueba', username: 'prueba', role, email: 'prueba@example.test', foto: '' };
    await context.addInitScript(({ user }) => { localStorage.setItem('token', 'e2e-token'); localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('biometricEnabled', 'false'); localStorage.setItem('asistenciaModalShown', new Date().toDateString()); }, { user });
    await context.route('**/*', async route => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.pathname.startsWith('/api/')) {
        requests.push({ method: req.method(), path: url.pathname });
        const endpoint = url.pathname.slice(4);
        let data = [];
        if (endpoint === '/auth/me') data = { user };
        else if (endpoint === '/users/status') data = { status: 1, estado_servicio: 1, user };
        else if (endpoint === '/events/stats') data = { weeklyIncome: [], badges: [], totalEarnings: 0, svcCount: 0 };
        else if (endpoint === '/cashregister/status') data = { hasOpenCaja: true, caja: { id: 'fake-caja' } };
        else if (endpoint === '/service-requests/pending-count') data = { count: 0, serviciosCount: 0, pedidosCount: 0 };
        else if (endpoint === '/bar' && !url.searchParams.has('acompanamientos')) data = stock;
        else if (endpoint === '/meals/rule') data = rule;
        else if (endpoint === '/meals') data = registros;
        else if (endpoint === '/rooms') data = rooms;
        else if (endpoint === '/transfers') data = { history: [] };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
      } else if (url.origin === base || ['data:', 'blob:'].includes(url.protocol)) await route.continue();
      else await route.abort();
    });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(120000);
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    return { context, page };
  }
  try {
    const { context, page } = await session('barman');
    await page.goto(`${base}/barman/bar`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Licores, 1 producto', exact: true })).toBeVisible({ timeout: 90000 });
    await expect(page.getByText('Ron de prueba', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Licores, 1 producto', exact: true }).click();
    await expect(page.getByText('Agua de prueba', { exact: true })).toHaveCount(0);
    await expect(page.locator('body')).toContainText('12.000');
    await page.screenshot({ path: path.join(__dirname, 'qoder-ui-expo-bar.png'), fullPage: true });
    await page.getByRole('button', { name: 'Todas, 2 productos', exact: true }).click();
    await expect(page.getByText('Agua de prueba', { exact: true })).toBeVisible();
    await context.close();
    const cashier = await session('cajero');
    await cashier.page.goto(`${base}/cajero/colaciones`, { waitUntil: 'domcontentloaded' });
    await expect(cashier.page.getByText('Garzon de prueba', { exact: true })).toBeVisible({ timeout: 45000 });
    await cashier.page.getByRole('button', { name: /Garzón.*1/ }).click();
    await expect(cashier.page.getByText('Garzon de prueba', { exact: true })).toBeVisible();
    await expect(cashier.page.getByText('Anfitriona de prueba', { exact: true })).toHaveCount(0);
    await cashier.page.screenshot({ path: path.join(__dirname, 'qoder-ui-expo-colaciones.png'), fullPage: true });
    await cashier.page.goto(`${base}/cajero/nuevo-servicio`);
    await cashier.page.getByRole('button', { name: 'Seleccionar habitación', exact: true }).click({ timeout: 45000 });
    await expect(cashier.page.getByRole('button', { name: 'VIP prueba 0, INACTIVA', exact: true })).toBeDisabled();
    await expect(cashier.page.getByRole('button', { name: 'VIP prueba 2, OCUPADA', exact: true })).toBeDisabled();
    await expect(cashier.page.getByRole('button', { name: 'VIP prueba 1, LIBRE', exact: true })).toBeEnabled();
    await cashier.page.screenshot({ path: path.join(__dirname, 'qoder-ui-expo-habitaciones.png'), fullPage: true });
    await cashier.page.getByRole('button', { name: 'VIP prueba 1, LIBRE', exact: true }).click();
    await expect(cashier.page.getByRole('button', { name: 'Seleccionar habitación', exact: true })).toContainText('VIP prueba 1');
    await cashier.context.close();
    if (errors.length || consoleErrors.length) throw new Error(`Errores de navegador: ${[...errors, ...consoleErrors].join('; ')}`);
    console.log(JSON.stringify({ result: 'PASS', checks: ['categorias bar', 'precio SIN', 'filtro colaciones', 'estados habitaciones'], apiRequests: requests.length, requestedPaths: [...new Set(requests.map(r => r.path))], realWrites: 0, errors, consoleErrors }, null, 2));
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { await browser.close(); }
})();
