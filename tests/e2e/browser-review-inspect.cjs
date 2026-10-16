const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const root = process.env.BROWSER_QA_OUTPUT || 'D:/DEV/lasmunecasderamon/_tmp/browser-review';
const state = JSON.parse(
  fs.readFileSync(
    process.env.BROWSER_QA_STATE || 'D:/DEV/lasmunecasderamon/_tmp/browser-qa-state.json',
    'utf8'
  )
);
let activeBrowser;
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  activeBrowser = browser;
  const context = await browser.newContext({
    storageState: root + '/auth.json',
    viewport: { width: Number(process.env.QA_WIDTH || 1440), height: 1000 }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('request', r => {
    if (r.url().includes('csp-violation')) console.log('CSP ' + r.postData());
  });
  page.on('pageerror', e => console.log('PAGEERROR ' + e.message));
  await page.goto(`http://127.0.0.1:${state.port}${process.argv[2]}`);
  await page.waitForTimeout(1000);
  if (process.argv[3]) {
    const button = page.getByRole('button', { name: process.argv[3], exact: true }).first();
    if (await button.count()) await button.click();
    else await page.getByText(process.argv[3], { exact: true }).first().click();
    await page.waitForTimeout(500);
  }
  console.log(
    JSON.stringify(
      {
        url: page.url(),
        text: (await page.locator('body').innerText()).slice(-10000),
        inputs: await page.locator('input,select,textarea').evaluateAll(es =>
          es.map(e => ({
            tag: e.tagName,
            id: e.id,
            name: e.name,
            type: e.type,
            placeholder: e.getAttribute('placeholder'),
            value: e.type === 'password' ? '***' : e.value
          }))
        ),
        buttons: await page.getByRole('button').allTextContents()
      },
      null,
      2
    )
  );
  await page.screenshot({
    path: root + '/inspect-' + process.argv[2].slice(1).replaceAll('/', '-') + '.png',
    fullPage: true
  });
  await browser.close();
}
main().catch(async e => {
  console.error(e);
  await activeBrowser?.close();
  process.exitCode = 1;
});
