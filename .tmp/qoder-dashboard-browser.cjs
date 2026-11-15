const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const esbuild = require('esbuild');
const postcss = require('postcss');
const tailwind = require('@tailwindcss/postcss');
const { chromium, expect } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const base = 'http://127.0.0.1:3091';
const product = { id: 'ron', code: 'RON-UI', name: 'Ron de prueba', categoria: 'Licores', category_id: 'licores', price: 20000, commission: 2000, max_anfitrionas: null, status: 1 };
const presentation = { id: 'p1', producto_id: 'ron', nombre: '750 ml', foto: null, precio_venta: 20000, comision: 2000, ml_shot: 50, ml_shot_anfitriona: 30, opciones_venta: [{ tipo: 'botella', precio: 20000, comision: 2000, precio_sin_anfitriona: 12000, vender_con_anfitriona: true, cover_habilitado: true }, { tipo: 'shot', precio: 4000, comision: 0, acompanamiento_cliente: false }] };
(async () => {
  await esbuild.build({ entryPoints: [path.join(__dirname, 'qoder-ui-entry.tsx')], outfile: path.join(__dirname, 'qoder-ui-bundle.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', alias: { '@': root }, define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'local-logger', setup(build) { build.onResolve({ filter: /^@\/lib\/utils\/logger$/ }, () => ({ path: 'logger', namespace: 'fixture' })); build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export default { captureException() {}, error() {}, warn() {}, info() {}, debug() {} };', loader: 'js' })); } }] });
  const cssPath = path.join(root, 'app/globals.css');
  const css = (await postcss([tailwind({ base: root })]).process(fs.readFileSync(cssPath, 'utf8'), { from: cssPath })).css;
  fs.writeFileSync(path.join(__dirname, 'qoder-ui-bundle.css'), css);
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, base).pathname;
    if (pathname === '/qoder-ui-bundle.js' || pathname === '/qoder-ui-bundle.css') { res.setHeader('Content-Type', pathname.endsWith('.js') ? 'text/javascript' : 'text/css'); res.end(fs.readFileSync(path.join(__dirname, pathname.slice(1)))); }
    else if (pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/qoder-ui-bundle.css"></head><body><div id="qoder-ui-root"></div><script src="/qoder-ui-bundle.js"></script></body></html>'); }
    else { res.statusCode = 404; res.end(); }
  });
  await new Promise(resolve => server.listen(3091, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const writes = [];
  try {
    for (const width of [390, 1280]) {
      const state = { product: structuredClone(product), presentation: structuredClone(presentation) };
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
      await context.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.pathname.startsWith('/api/')) {
          if (url.pathname.startsWith('/api/images/')) return route.fulfill({ status: 204, body: '' });
          let data = [];
          if (request.method() !== 'GET') {
            const body = request.postDataJSON();
            writes.push({ width, path: url.pathname, body });
            if (url.pathname === '/api/products/presentations') Object.assign(state.presentation, body);
            else if (url.pathname === '/api/products/ron') Object.assign(state.product, body);
            else if (url.pathname === '/api/tickets/entregar-grupo') data = { entradas: 1, productos: body.unidades.length, montoEntrada: 10000, montoCobrarBarra: body.monto_adicional, presupuesto: 10000 + body.monto_adicional };
          } else if (url.pathname === '/api/products') data = [state.product];
          else if (url.pathname === '/api/bar') data = [state.presentation];
          else if (url.pathname === '/api/configurations') data = { bar: { ml_shot: 50 } };
          else if (url.pathname === '/api/products/for-sale' && !url.searchParams.has('solo_cover')) data = [
            { ...state.presentation, presentacion_id: 'p1', producto_nombre: 'Ron de prueba', presentacion_nombre: '750 ml', categoria_nombre: 'Licores', stock_bar: 4, ml_botella: 750 },
            { presentacion_id: 'p2', producto_nombre: 'Agua de prueba', presentacion_nombre: '350 ml', categoria_nombre: 'Bebidas', stock_bar: 5, precio_venta: 2000, opciones_venta: [{ tipo: 'botella', precio: 2000, precio_sin_anfitriona: 2000 }] }
          ];
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
        }
        if (url.origin === base) return route.continue();
        return route.abort();
      });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.goto(base);
      const sin = page.getByLabel('Precio de botella sin anfitriona', { exact: true });
      await expect(sin).toHaveValue('12.000');
      await sin.fill('15000');
      const con = page.getByLabel('Vender con anfitriona', { exact: true });
      await con.focus();
      await page.keyboard.press('Space');
      await expect(con).not.toBeChecked();
      const contrast = await page.locator('label, h3').evaluateAll(labels => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d');
        const rgba = color => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data]; };
        const luminance = rgb => rgb.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
        return labels.filter(label => ['Con anfitriona', 'Precio de botella sin anfitriona'].includes(label.textContent.trim())).map(label => {
          const foreground = rgba(getComputedStyle(label).color);
          let background = [255, 255, 255, 255];
          for (let parent = label; parent; parent = parent.parentElement) {
            const candidate = rgba(getComputedStyle(parent).backgroundColor);
            if (candidate[3] === 255) { background = candidate; break; }
          }
          const a = luminance(foreground), b = luminance(background);
          return { text: label.textContent.trim(), ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
        });
      });
      expect(contrast).toHaveLength(2);
      for (const label of contrast) expect(label.ratio).toBeGreaterThanOrEqual(4.5);
      console.log(JSON.stringify({ width, contrast }));
      const save = page.getByRole('button', { name: 'Guardar Cambios', exact: true });
      await save.click();
      await expect(save).toBeEnabled();
      await expect(sin).toHaveValue('15.000');
      await page.reload();
      await expect(sin).toHaveValue('15.000');
      await expect(page.getByLabel('Vender con anfitriona', { exact: true })).not.toBeChecked();
      await sin.fill('16000');
      await save.click();
      await expect(save).toBeEnabled();
      await expect(sin).toHaveValue('16.000');
      await expect(page.getByText('Presentación actualizada', { exact: true }).last()).toBeVisible();
      await expect(save).toBeEnabled();
      await page.screenshot({ path: path.join(__dirname, `qoder-ui-settings-${width}.png`), fullPage: true });
      await page.goto(`${base}/?view=covers`);
      await page.getByRole('button', { name: 'Abrir covers de prueba', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.getByRole('button', { name: 'Abrir covers de prueba', exact: true }).click();
      await expect(page.getByRole('region', { name: 'Licores', exact: true })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Bebidas', exact: true })).toBeVisible();
      const aporte = page.getByLabel('Monto adicional del grupo');
      await aporte.fill('4000');
      const corte = page.getByRole('button', { name: /Ron de prueba.*Corte/ });
      await corte.click(); await corte.click(); await corte.click();
      await expect(page.getByText(/3 productos para 1 entrada/)).toBeVisible();
      await expect(corte).toBeDisabled();
      await aporte.fill('1000');
      await expect(aporte).toHaveValue('4000');
      await expect(page.getByRole('alert')).toContainText('Quita productos antes de reducir');
      await page.screenshot({ path: path.join(__dirname, `qoder-ui-covers-${width}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Entregar 3 en la barra', exact: true }).click();
      await expect(page.getByRole('status', { name: 'Entregas del harness' })).toContainText('1');
      const delivery = writes.filter(w => w.width === width && w.path === '/api/tickets/entregar-grupo');
      expect(delivery).toHaveLength(1);
      expect(delivery[0].body).toMatchObject({ entrada_ids: ['qoder-ui-entrada-1'], monto_adicional: 4000 });
      expect(delivery[0].body.unidades).toHaveLength(3);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await context.close();
    }
    expect(errors).toEqual([]);
    console.log(JSON.stringify({ result: 'PASS', widths: [390, 1280], checks: ['guardado doble y recarga', 'checkbox CON', 'categorias covers', 'presupuesto', 'una entrega grupal'], errors, realWrites: 0 }, null, 2));
  } catch (e) { console.error(e); process.exitCode = 1; }
  finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
