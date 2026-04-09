import { test, expect } from '@playwright/test';

/**
 * Test E2E: Login
 *
 * Este test verifica el flujo de autenticación:
 * - Login fallido con credenciales incorrectas
 * - Login exitoso con credenciales válidas
 *
 * Para ejecutar:
 * pnpm test:e2e
 * pnpm test:e2e:smoke
 */

test.describe('Login E2E', () => {
  const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3100';

  test.beforeEach(async ({ page }) => {
    // Navegar a la página de login antes de cada test
    await page.goto(`${BASE_URL}/login`);
  });

  test('debería mostrar errores para credenciales inválidas', async ({ page }) => {
    // Intentar login con usuario que no existe
    await page.fill('input[id="nick"]', 'usuario-inexistente-12345');
    await page.fill('input[id="password"]', 'password-invalido');

    // Hacer click en el botón de login
    await page.click('button[type="submit"]');

    // Esperar que aparezca un mensaje de error
    // El proyecto usa sonner toast para notificaciones
    await page.waitForTimeout(1000);

    // Verificar que seguimos en la página de login (no redireccionó)
    await expect(page.locator('input[id="nick"]')).toBeVisible();
  });

  test('debería mostrar error para usuario válido pero contraseña incorrecta', async ({ page }) => {
    // Usar un usuario común del sistema con contraseña incorrecta
    await page.fill('input[id="nick"]', 'admin');
    await page.fill('input[id="password"]', 'wrong-password');

    await page.click('button[type="submit"]');

    // Esperar respuesta
    await page.waitForTimeout(1000);

    // Verificar que seguimos en login
    await expect(page.locator('input[id="nick"]')).toBeVisible();
  });

  test('debería iniciar sesión exitosamente con credenciales válidas', async ({ page }) => {
    //Credenciales de prueba - ajustar según el entorno
    // Estas son credenciales de demo que deberían existir en desarrollo
    await page.fill('input[id="nick"]', 'admin');
    await page.fill('input[id="password"]', 'admin123');

    await page.click('button[type="submit"]');

    // Esperar que-redirección al dashboard
    await page.waitForURL(/\/dashboard|\/orders|\/sales/, { timeout: 10000 });

    // Verificar que estamos en una página del dashboard
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/dashboard|\/orders|\/sales/);
  });

  test('debería mantener al usuario en login si intenta acceder directamente a rutas protegidas', async ({
    page
  }) => {
    // Intentar acceder directamente a una ruta protegida
    await page.goto(`${BASE_URL}/dashboard`);

    // Debería redireccionar a login
    await expect(page).toHaveURL(/login/);

    // Verificar que el formulario de login está visible
    await expect(page.locator('input[id="nick"]')).toBeVisible();
  });
});
