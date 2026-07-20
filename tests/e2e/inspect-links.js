const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/asistencia-qr', { waitUntil: 'load' });
  // Wait for any link to appear
  await page.waitForSelector('a', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a, button')).map(el => ({
      tag: el.tagName,
      href: el.getAttribute('href'),
      text: el.textContent?.trim().substring(0, 60),
      class: el.className?.substring(0, 60)
    }))
  );
  console.log('Elements found:', JSON.stringify(links, null, 2));
  await browser.close();
})();
