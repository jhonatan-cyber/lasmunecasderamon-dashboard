import { test, expect } from '@playwright/test';

// The production PWA worker bypasses Playwright routes; keep transport simulated.
test.use({ serviceWorkers: 'block' });

test('WhatsApp: prueba explícita, URL de callback y actualización de entrega', async ({ page }) => {
  test.skip(!process.env.TEST_PASSWORD, 'Se necesita un administrador de pruebas');
  test.setTimeout(120_000);
  let sent = false;
  let delivered = false;
  // Simulate the transport: this browser test must never send a real WhatsApp.
  await page.route('**/api/whatsapp/test', async route => {
    if (route.request().method() === 'POST') {
      sent = true;
      await route.fulfill({
        json: { success: true, data: { destino: '••••0000', seguimientoGuardado: true } }
      });
      return;
    }
    await route.fulfill({
      json: {
        success: true,
        data: {
          incomingUrl: 'https://dashboard.example.com/api/whatsapp/webhook',
          statusCallbackUrl: 'https://dashboard.example.com/api/whatsapp/status',
          messages: sent
            ? [
                {
                  message_sid: 'SM-test',
                  destino: '••••0000',
                  tipo: 'prueba',
                  estado: delivered ? 'delivered' : 'queued',
                  error_code: null
                }
              ]
            : []
        }
      }
    });
  });
  const usersLoaded = page.waitForResponse(
    response => response.url().includes('/api/auth/check-users') && response.status() === 200
  );
  await page.goto('/login');
  await usersLoaded;
  await page.locator('#nick').fill(process.env.TEST_USER || 'admin');
  await page.locator('#password').fill(process.env.TEST_PASSWORD!);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(url => !url.pathname.includes('/login'));
  const settingsLoaded = page.waitForResponse(
    response =>
      new URL(response.url()).pathname === '/api/configurations' && response.status() === 200
  );
  await page.goto('/settings');
  await settingsLoaded;
  await page.getByRole('tab', { name: 'WhatsApp', exact: true }).click();
  await expect(page.getByLabel('Status callback URL')).toHaveValue(
    'https://dashboard.example.com/api/whatsapp/status'
  );
  expect(sent).toBe(false);
  await page.getByRole('button', { name: 'Enviar mensaje de prueba', exact: true }).click();
  await expect(page.getByText('En cola', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: 'Prueba aceptada por Twilio para' })
  ).toBeVisible();
  delivered = true;
  await page.getByRole('button', { name: 'Actualizar estados de WhatsApp' }).click();
  await expect(page.getByText('Entregado', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/whatsapp-settings.png', fullPage: true });
});
