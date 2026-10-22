const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const root = process.env.BROWSER_QA_OUTPUT || 'D:/DEV/lasmunecasderamon/_tmp/browser-review';
const state = JSON.parse(
  fs.readFileSync(
    process.env.BROWSER_QA_STATE || 'D:/DEV/lasmunecasderamon/_tmp/browser-qa-state.json',
    'utf8'
  )
);
if (!/^qa_browser_\d+$/.test(state.database)) throw Error('Operaciones permitidas solamente en QA');

let activeBrowser;
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  activeBrowser = browser;
  const context = await browser.newContext({
    storageState: `${root}/auth.json`,
    viewport: { width: 1440, height: 1000 }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(60000);
  const results = fs.existsSync(`${root}/actions.json`)
    ? JSON.parse(fs.readFileSync(`${root}/actions.json`, 'utf8'))
    : [];
  const selected = process.env.BROWSER_QA_ACTIONS?.split(',');
  let current;
  function nextResponse(target, predicate) {
    const pending = target.waitForResponse(predicate, { timeout: 20000 });
    pending.catch(() => {});
    return pending;
  }
  page.on('pageerror', error => current?.errors.push(error.message));
  page.on('response', response => {
    if (response.url().includes('/api/') && response.status() >= 400)
      current?.http.push({ status: response.status(), url: new URL(response.url()).pathname });
  });
  async function run(name, route, action) {
    if (selected && !selected.includes(name)) return;
    current = { name, route, errors: [], http: [] };
    try {
      await page.goto(`http://127.0.0.1:${state.port}${route}`);
      await page.waitForTimeout(800);
      const hideTimers = page.getByRole('button', { name: 'Ocultar temporizadores', exact: true });
      if (await hideTimers.count()) await hideTimers.click();
      await action();
      current.passed = true;
    } catch (error) {
      current.passed = false;
      current.failure = error.message;
    }
    current.text = (
      await page
        .locator('body')
        .innerText()
        .catch(() => '')
    ).slice(-8000);
    await page.screenshot({ path: `${root}/action-${name}.png`, fullPage: true });
    const previous = results.findIndex(result => result.name === name);
    if (previous >= 0) results.splice(previous, 1);
    results.push(current);
    fs.writeFileSync(`${root}/actions.json`, JSON.stringify(results, null, 2));
    console.log(
      JSON.stringify({
        name,
        passed: current.passed,
        errors: current.errors,
        http: current.http,
        failure: current.failure
      })
    );
    await page.keyboard.press('Escape');
  }
  async function save(label = 'Guardar') {
    const response = nextResponse(
      page,
      r =>
        r.request().method() === 'POST' &&
        r.url().includes('/api/') &&
        !r.url().includes('csp-violation')
    );
    await page.getByRole('button', { name: label, exact: true }).click();
    const result = await response;
    expect(result.status(), await result.text()).toBeLessThan(300);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await run('category-create', '/categories', async () => {
    if (await page.getByText(/^QA Bebidas$/i).count()) return;
    await page.getByRole('button', { name: 'Nueva Categoría', exact: true }).click();
    await page.locator('#categoryName').fill('QA Bebidas');
    await page.locator('#categoryDescription').fill('Categoría de prueba de navegador');
    await save();
    await expect(page.getByText(/^QA Bebidas$/i).first()).toBeVisible();
  });
  await run('client-create', '/clients', async () => {
    if (await page.getByText(/^Cliente QA$/i).count()) return;
    await page.getByRole('button', { name: 'Nuevo Cliente', exact: true }).click();
    await page.locator('#client-name').fill('Cliente QA');
    await page.locator('#client-lastName').fill('Navegador');
    await save();
    await expect(page.getByText(/Cliente QA/i).first()).toBeVisible();
  });
  await run('room-create', '/rooms', async () => {
    if (await page.getByText(/^Habitación QA$/i).count()) return;
    await page.getByRole('button', { name: 'Nueva Habitacion', exact: true }).click();
    await page.locator('#room-name').fill('Habitación QA');
    await page.locator('#room-price').fill('20000');
    await page.locator('#room-time').fill('30');
    await page.locator('#room-comm').fill('5000');
    await save();
    await expect(page.getByText(/^Habitación QA$/i).first()).toBeVisible();
  });
  await run('cash-open', '/cash-register', async () => {
    await page.getByRole('button', { name: 'Abrir Nueva Caja', exact: true }).click();
    await page.locator('#monto_apertura').fill('100000');
    await save('Confirmar Apertura');
    await expect(page.getByText('SIN CAJAS ACTIVAS')).toHaveCount(0);
  });
  await run('cash-withdraw', '/cash-register', async () => {
    await page.getByRole('button', { name: 'Retirar', exact: true }).first().click();
    await page.locator('#monto').fill('1000');
    await page.locator('#motivo').fill('Retiro de prueba QA');
    await save('Confirmar Retiro');
    await page.getByRole('button', { name: 'Detalle de Caja', exact: true }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar Detalles', exact: true }).click();
  });
  await run('role-create', '/roles', async () => {
    await page.getByRole('button', { name: 'Nuevo Rol', exact: true }).click();
    await page.locator('#role-name').fill('QA Auditor');
    await page.locator('#role-description').fill('Rol para pruebas de navegador');
    await save();
    await expect(page.getByText(/^QA Auditor$/i).first()).toBeVisible();
  });
  await run('role-lifecycle', '/roles', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    const card = page.locator('div.w-full.rounded-lg.shadow-xs').filter({
      has: page.getByRole('heading', { name: /^QA Auditor$/i })
    });
    await card.getByRole('button', { name: 'Acciones', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Editar', exact: true }).click();
    await page.locator('#role-description').fill('Descripción actualizada desde navegador');
    let response = nextResponse(
      page,
      r => r.request().method() === 'PUT' && r.url().includes('/api/roles/')
    );
    await page.getByRole('button', { name: 'Guardar Cambios', exact: true }).click();
    expect((await response).status()).toBeLessThan(300);
    for (const label of ['Desactivar', 'Activar']) {
      await card.getByRole('button', { name: 'Acciones', exact: true }).click();
      response = nextResponse(
        page,
        r => r.request().method() === 'PUT' && r.url().includes('/api/roles/')
      );
      await page.getByRole('menuitem', { name: label, exact: true }).click();
      if (label === 'Desactivar')
        await page.getByRole('button', { name: label, exact: true }).click();
      expect((await response).status()).toBeLessThan(300);
      await expect(
        card.getByText(label === 'Desactivar' ? 'Inactivo' : 'Activo', { exact: true })
      ).toBeVisible();
    }
    await card.getByRole('button', { name: 'Acciones', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Eliminar', exact: true }).click();
    response = nextResponse(
      page,
      r => r.request().method() === 'DELETE' && r.url().includes('/api/roles/')
    );
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
    expect((await response).status()).toBeLessThan(300);
    await expect(card).toHaveCount(0);
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await run('product-create', '/products', async () => {
    await page
      .getByText(/^QA Bebidas$/i)
      .first()
      .click();
    await page.getByRole('button', { name: 'Nuevo producto', exact: true }).click();
    await page.locator('#prod-name').fill('Bebida QA');
    await page.getByRole('button', { name: 'Agregar', exact: true }).click();
    await page.getByLabel('Cantidad de la presentación').fill('750');
    await page.getByPlaceholder('Precio compra', { exact: true }).fill('3000');
    await page.getByPlaceholder('Stock', { exact: true }).fill('10');
    const response = nextResponse(
      page,
      r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/products'
    );
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    const result = await response;
    expect(result.status(), await result.text()).toBeLessThan(300);
    await page.waitForTimeout(700);
    await page.keyboard.press('Escape');
    await expect(page.getByText(/^Bebida QA$/i).first()).toBeVisible();
  });
  await run('purchase-create', '/purchases/new', async () => {
    await page.getByRole('button', { name: 'Agregar', exact: true }).first().click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.locator('input[id*="-cantidad-"]').fill('4');
    await page.getByPlaceholder('Nombre del proveedor').fill('Proveedor QA');
    await page.getByRole('button', { name: 'Revisar compra', exact: true }).click();
    const response = nextResponse(
      page,
      r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/purchases'
    );
    await page.getByRole('button', { name: 'Finalizar compra', exact: true }).click();
    const result = await response;
    expect(result.status(), await result.text()).toBeLessThan(300);
    await expect(
      page.getByText(/Compra registrada|Códigos generados|Imprimir códigos/).first()
    ).toBeVisible();
  });
  await run('attendance-bulk', '/attendance', async () => {
    page.once('dialog', dialog => dialog.accept());
    const response = nextResponse(
      page,
      r => r.request().method() === 'POST' && r.url().includes('/api/attendance/')
    );
    await page.getByRole('button', { name: 'Entrada masiva hoy', exact: true }).click();
    const result = await response;
    expect(result.status(), await result.text()).toBeLessThan(300);
    await page.waitForTimeout(1000);
    await expect(
      page.getByText(/asistencia registrada|ya tenían asistencia/i).first()
    ).toBeVisible();
  });
  await run('inventory-transfer', '/transfers', async () => {
    const pending = page.getByRole('tab', { name: /^Pendientes/ });
    if (/\([1-9]/.test(await pending.innerText())) {
      await pending.click();
      await expect(page.getByText(/Bebida Qa/i).first()).toBeVisible();
      return;
    }
    await page.getByText('Transferir', { exact: true }).first().click();
    await page.locator('#transfer-quantity').fill('3');
    if (await page.locator('#price-botella').count())
      await page.locator('#price-botella').fill('5000');
    await save('Transferir');
    await pending.click();
    await expect(page.getByText(/Bebida Qa/i).first()).toBeVisible();
  });
  await run('bar-receive', '/bar', async () => {
    const receiverContext = await browser.newContext({
      storageState: `${root}/role-barman/auth.json`,
      viewport: { width: 1440, height: 1000 }
    });
    try {
      const receiver = await receiverContext.newPage();
      receiver.setDefaultTimeout(15000);
      receiver.on('pageerror', error => current.errors.push(error.message));
      await receiver.goto(`http://127.0.0.1:${state.port}/bar`);
      await receiver.getByRole('tab', { name: /^Pendientes/ }).click();
      await expect(
        receiver
          .getByRole('button', { name: 'Aprobar', exact: true })
          .or(receiver.getByText('No hay solicitudes pendientes.', { exact: true }))
          .first()
      ).toBeVisible();
      if (await receiver.getByText('No hay solicitudes pendientes.', { exact: true }).isVisible())
        return;
      const response = nextResponse(
        receiver,
        r => r.request().method() === 'PATCH' && new URL(r.url()).pathname === '/api/transfers'
      );
      await receiver.getByRole('button', { name: 'Aprobar', exact: true }).first().click();
      const result = await response;
      expect(result.status(), await result.text()).toBeLessThan(300);
      await expect(
        receiver.getByText('No hay solicitudes pendientes.', { exact: true })
      ).toBeVisible();
      await receiver.screenshot({ path: `${root}/action-bar-receive-barman.png`, fullPage: true });
    } finally {
      await receiverContext.close();
    }
    await page.reload();
  });
  await run('private-service-create', '/private-rooms/new', async () => {
    await page.getByText('Seleccionar habitación', { exact: true }).click();
    await page
      .getByText(/^Habitación QA/i)
      .last()
      .click();
    await page.getByText('Seleccionar anfitrionas', { exact: true }).click();
    await page.getByText('qa_anfitriona', { exact: true }).last().click();
    await page.keyboard.press('Escape');
    await page.getByText('Seleccionar método de pago', { exact: true }).click();
    await page.getByRole('button', { name: 'Efectivo', exact: true }).click();
    await page
      .getByRole('combobox', { name: 'Producto incluido en la habitación', exact: true })
      .click();
    await page
      .getByRole('option', { name: /Bebida Qa/i })
      .first()
      .click();
    await page.getByRole('button', { name: 'Generar Servicio', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Confirmar creación de servicio' })
    ).toBeVisible();
    const response = nextResponse(
      page,
      r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/services'
    );
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
    const result = await response;
    expect(result.status(), await result.text()).toBeLessThan(300);
    await expect(page).toHaveURL(/\/private-rooms$/);
  });
  async function addBottle() {
    await page
      .getByText(/^QA Bebidas$/i)
      .first()
      .click();
    await page
      .getByRole('button', { name: /Botella: aumentar cantidad/i })
      .first()
      .click();
    await page.getByRole('button', { name: 'Agregar producto', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await run('account-create', '/accounts/new', async () => {
    await addBottle();
    await page.getByText('Seleccione un cliente', { exact: true }).click();
    await page
      .getByRole('button', { name: /Cliente Qa/i })
      .first()
      .click();
    const response = nextResponse(
      page,
      r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/accounts'
    );
    await page.getByRole('button', { name: 'Generar Cuenta', exact: true }).click();
    const result = await response;
    expect(result.status(), await result.text()).toBeLessThan(300);
    await expect(page).toHaveURL(/\/accounts$/);
  });
  await run('account-add', '/accounts', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Agregar', exact: true }).first().click();
    await page
      .getByText(/^QA Bebidas$/i)
      .first()
      .click();
    await page
      .getByRole('button', { name: /Botella: aumentar cantidad/i })
      .first()
      .click();
    await page.getByRole('button', { name: 'Agregar producto', exact: true }).click();
    const response = nextResponse(
      page,
      r => ['POST', 'PUT'].includes(r.request().method()) && r.url().includes('/api/accounts/')
    );
    await page.getByRole('button', { name: 'Agregar', exact: true }).last().click();
    const result = await response;
    expect(result.status(), await result.text()).toBeLessThan(300);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
  await run('account-charge', '/accounts', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Cobrar', exact: true }).first().click();
    await page.locator('#cobrar-metodo-pago').click();
    await page.getByRole('option', { name: 'Efectivo', exact: true }).click();
    const response = nextResponse(
      page,
      r => r.request().method() === 'POST' && r.url().includes('/api/accounts/')
    );
    await page.getByRole('button', { name: 'Cobrar Cuenta', exact: true }).click();
    const result = await response;
    expect(result.status(), await result.text()).toBeLessThan(300);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await run('sale-create', '/sales/new', async () => {
    await addBottle();
    await page.getByText('Seleccione un método de pago', { exact: true }).click();
    await page.getByRole('button', { name: 'Efectivo', exact: true }).click();
    const response = nextResponse(
      page,
      r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/sales'
    );
    await page.getByRole('button', { name: 'GENERAR VENTA', exact: true }).click();
    const result = await response;
    expect(result.status(), await result.text()).toBeLessThan(300);
    await expect(page).toHaveURL(/\/sales$/);
  });
  await run('order-create', '/orders/new', async () => {
    await addBottle();
    await page.getByText('Seleccione un método de pago', { exact: true }).click();
    await page.getByRole('button', { name: 'Efectivo', exact: true }).click();
    const response = nextResponse(
      page,
      r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/orders'
    );
    await page.getByRole('button', { name: 'Generar pedido', exact: true }).click();
    const result = await response;
    expect(result.status(), await result.text()).toBeLessThan(300);
    await expect(page).toHaveURL(/\/orders$/);
  });
  await run('overtime-create', '/overtime', async () => {
    await page.getByRole('button', { name: 'Nueva Hora Extra', exact: true }).click();
    await page.getByText('Busca un empleado...', { exact: true }).click();
    await page.getByRole('button', { name: /^QA garzon Navegador/i }).click();
    await page.locator('#hora').fill('2');
    await page.locator('#monto').fill('1500');
    await save();
  });
  await run('advance-create', '/advances', async () => {
    await page.getByRole('button', { name: 'Nueva solicitud', exact: true }).click();
    await page.getByText('Busca un empleado...', { exact: true }).click();
    await page.getByRole('button', { name: /^QA garzon Navegador/i }).click();
    await page.locator('#monto').fill('2000');
    await page.locator('#motivo').fill('Anticipo QA navegador');
    await save();
  });
  async function cleaningSave(label = 'Guardar') {
    const response = nextResponse(
      page,
      r => r.request().method() === 'POST' && r.url().includes('/api/cleaning')
    );
    await page.getByRole('button', { name: label, exact: true }).click();
    const result = await response;
    expect(result.status(), await result.text()).toBeLessThan(300);
    await page.waitForTimeout(500);
  }
  await run('cleaning-create', '/cleaning', async () => {
    await page.getByRole('button', { name: 'Nuevo artículo', exact: true }).click();
    await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Detergente QA');
    await page.getByLabel('Stock mínimo en almacén').fill('2');
    await cleaningSave();
    await expect(page.getByText('Detergente QA', { exact: true }).first()).toBeVisible();
  });
  await run('cleaning-receive', '/cleaning', async () => {
    await page.getByRole('button', { name: 'Ingreso al almacén', exact: true }).click();
    await page
      .getByRole('combobox', { name: /^Artículo/ })
      .selectOption({ label: 'Detergente QA (unidad)' });
    await page.getByLabel('Cantidad', { exact: true }).fill('10');
    await page.getByLabel('Costo por unidad', { exact: true }).fill('1000');
    await cleaningSave();
  });
  await run('cleaning-transfer', '/cleaning', async () => {
    await page
      .getByRole('combobox', { name: /^Artículo/ })
      .selectOption({ label: 'Detergente QA (unidad)' });
    await page.getByLabel('Cantidad', { exact: true }).fill('3');
    await page.getByLabel('Origen', { exact: true }).selectOption('almacen');
    const destination = page.getByLabel('Destino', { exact: false });
    const options = await destination.locator('option').evaluateAll(es => es.map(e => e.value));
    await destination.selectOption(options.find(value => value !== 'almacen'));
    await cleaningSave('Enviar traspaso');
    await expect(
      page.getByRole('button', { name: 'Aceptar recepción', exact: true }).first()
    ).toBeVisible();
    await cleaningSave('Aceptar recepción');
    await expect(page.getByRole('button', { name: 'Aceptar recepción', exact: true })).toHaveCount(
      0
    );
  });
  await run('notifications-read', '/notifications', async () => {
    await expect(page.getByText('Aviso QA navegador', { exact: true })).toBeVisible();
    const mark = page.getByRole('button', { name: 'Marcar todas como leídas', exact: true });
    if (await mark.isEnabled()) await mark.click();
    await expect(page.getByRole('button', { name: 'Sin leer (0)', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Sin leer (0)', exact: true })).toBeVisible();
    await expect(page.getByText('Monitor 4K', { exact: false })).toHaveCount(0);
  });
  await run('client-filter-export', '/clients', async () => {
    await page.locator('#search').fill('Cliente QA');
    await expect(page.getByRole('cell', { name: /^Cliente QA$/i }).first()).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Excel', exact: true }).click();
    const file = await download;
    await file.saveAs(`${root}/qa-clientes.xlsx`);
    expect(await file.failure()).toBeNull();
  });
  await run('help-search-navigation', '/help', async () => {
    await page.getByPlaceholder('Buscar en la ayuda...').fill('contraseña');
    await page.getByRole('button', { name: /¿Cómo puedo cambiar mi contraseña/ }).click();
    await expect(page.getByText(/Debes confirmar tu contraseña actual/)).toBeVisible();
    await page
      .getByRole('link', { name: /Bodega/ })
      .last()
      .click();
    await expect(page).toHaveURL(/\/products$/);
  });
  await run('user-required-validation', '/users', async () => {
    await page.getByRole('button', { name: 'Nuevo Usuario', exact: true }).click();
    await page.locator('#user-form').evaluate(form => form.requestSubmit());
    await expect(page.getByText('El nick debe tener al menos 3 caracteres')).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  });
  await run('theme-toggle', '/dashboard', async () => {
    const before = await page.locator('html').getAttribute('class');
    await page.getByRole('button', { name: 'Cambiar tema', exact: true }).click();
    await expect(page.locator('html')).not.toHaveAttribute('class', before);
    await page.screenshot({ path: `${root}/action-dark-dashboard.png`, fullPage: true });
    await page.getByRole('button', { name: 'Cambiar tema', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('class', before);
  });
  for (const [module, route, button] of [
    ['categories', '/categories', 'Nueva Categoría'],
    ['clients', '/clients', 'Nuevo Cliente'],
    ['users', '/users', 'Nuevo Usuario'],
    ['roles', '/roles', 'Nuevo Rol'],
    ['rooms', '/rooms', 'Nueva Habitacion'],
    ['cash', '/cash-register', 'Retirar']
  ]) {
    await run(`mobile-dialog-${module}`, route, async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole('button', { name: button, exact: true }).first().click();
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible();
      await page.waitForTimeout(500);
      const box = await dialog.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(391);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(845);
    });
  }
  await browser.close();
  if (results.some(r => !r.passed || r.errors.length || r.http.length)) process.exitCode = 1;
}
main().catch(async error => {
  console.error(error);
  await activeBrowser?.close();
  process.exitCode = 1;
});
