const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const statePath =
  process.env.BROWSER_QA_STATE || 'D:/DEV/lasmunecasderamon/_tmp/browser-qa-state.json';
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
if (!/^qa_browser_\d+$/.test(state.database))
  throw new Error('Se requiere una base QA independiente');
const base = `http://127.0.0.1:${state.port}`;
const output = process.env.BROWSER_QA_OUTPUT || 'D:/DEV/lasmunecasderamon/_tmp/browser-review';
fs.mkdirSync(output, { recursive: true });
const adminRoutes = [
  '/dashboard',
  '/orders',
  '/orders/new',
  '/accounts',
  '/accounts/new',
  '/sales',
  '/sales/new',
  '/private-rooms',
  '/private-rooms/new',
  '/solicitudes-servicios',
  '/rooms',
  '/cash-register',
  '/products',
  '/categories',
  '/bar',
  '/products/containers',
  '/purchases',
  '/purchases/new',
  '/transfers',
  '/cleaning',
  '/clients',
  '/users',
  '/roles',
  '/attendance',
  '/advances',
  '/commissions',
  '/tips',
  '/overtime',
  '/gratificaciones',
  '/payroll',
  '/payroll/summary',
  '/payroll/calendar',
  '/returns',
  '/returns/sales',
  '/returns/services',
  '/reports',
  '/notifications',
  '/error-logs',
  '/settings',
  '/profile',
  '/help'
];
const role = process.env.BROWSER_QA_ROLE;
const personalRoutes =
  role && ['anfitriona', 'garzon', 'cajero', 'barman'].includes(role)
    ? [
        `/${role}-asistencias`,
        `/${role}-anticipos`,
        `/${role}-calendar`,
        ...(role === 'anfitriona'
          ? ['/anfitriona-dashboard', '/anfitriona-comisiones', '/anfitriona-servicios']
          : [
              `/${role}-propinas`,
              `/${role}-horas-extras`,
              ...(role === 'garzon'
                ? ['/garzon-dashboard', '/garzon-pedidos']
                : role === 'barman'
                  ? ['/bar']
                  : ['/cash-register'])
            ])
      ]
    : null;
const routes = process.env.BROWSER_QA_ROUTES?.split(',') || personalRoutes || adminRoutes;
if (personalRoutes) state.nick = `qa_${role}`;

let activeBrowser;
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  activeBrowser = browser;
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: process.env.BROWSER_QA_DARK ? 'dark' : 'light' });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(120000);
  let current = null;
  page.on('pageerror', error => current?.errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') current?.console.push(message.text());
  });
  page.on('response', response => {
    if (response.url().startsWith(base) && response.status() >= 400)
      current?.http.push({ status: response.status(), url: response.url().slice(base.length) });
  });
  await Promise.all([
    page.waitForResponse(response => response.url().includes('/api/auth/check-users'), { timeout: 120000 }),
    page.goto(`${base}/login`)
  ]);
  await page.locator('#nick').fill(state.nick);
  await page.locator('#password').fill(state.password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 });
  await context.storageState({ path: path.join(output, 'auth.json') });
  const results = [];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const route of routes) {
      current = { route, width, errors: [], console: [], http: [] };
      const start = Date.now();
      try {
        await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(1300);
        await page
          .locator('[role="status"]')
          .first()
          .waitFor({ state: 'hidden', timeout: 1500 })
          .catch(() => {});
        current.url = new URL(page.url()).pathname;
        current.text = (await page.locator('body').innerText()).slice(0, 14000);
        current.headings = await page.getByRole('heading').allTextContents();
        current.buttons = await page.getByRole('button').allTextContents();
        current.layout = await page.evaluate(() => ({
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
          overflow: [...document.querySelectorAll('body *')]
            .filter(element => {
              const box = element.getBoundingClientRect();
              return (
                box.width > 0 &&
                box.left >= 0 &&
                box.right > innerWidth + 3 &&
                getComputedStyle(element).position !== 'fixed' &&
                !element.closest(
                  '[role="table"],table,[data-radix-popper-content-wrapper],.overflow-x-auto'
                )
              );
            })
            .slice(0, 15)
            .map(element => ({
              tag: element.tagName,
              className: String(element.className).slice(0, 120)
            }))
        }));
        const filename = `${width}-${route.slice(1).replaceAll('/', '-')}.png`;
        await page.screenshot({ path: path.join(output, filename), fullPage: true });
        current.screenshot = filename;
      } catch (error) {
        current.failure = error.message;
      }
      current.ms = Date.now() - start;
      results.push(current);
      fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
      console.log(
        JSON.stringify({
          route,
          width,
          errors: current.errors,
          http: current.http,
          overflow: current.layout?.document > width + 3,
          failure: current.failure,
          ms: current.ms
        })
      );
    }
  }
  await browser.close();
}
main().catch(async error => {
  console.error(error);
  await activeBrowser?.close();
  process.exitCode = 1;
});
