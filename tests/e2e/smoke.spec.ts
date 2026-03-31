import { test, expect } from '@playwright/test';

test.describe('Pruebas de Humo (Smoke Tests)', () => {
  test('debería cargar la página de inicio de sesión', async ({ page }) => {
    await page.goto('/login');

    const heading = page.getByRole('heading', { name: /Iniciar sesión/i });
    await expect(heading).toBeVisible();

    const welcomeText = page.getByText(/Las Muñecas de Ramón/i);
    await expect(welcomeText.first()).toBeVisible();
  });

  test('debería mostrar el formulario de login con campos de usuario y contraseña', async ({ page }) => {
    await page.goto('/login');

    const userLabel = page.getByText('Usuario', { exact: true });
    await expect(userLabel).toBeVisible();

    const passwordLabel = page.getByText('Contraseña', { exact: true });
    await expect(passwordLabel).toBeVisible();

    const userInput = page.getByPlaceholder(/admin, pepe, lizi.../i);
    await expect(userInput).toBeVisible();

    const passwordInput = page.getByPlaceholder('Contraseña', { exact: true });
    await expect(passwordInput).toBeVisible();

    const loginButton = page.getByRole('button', { name: /Iniciar sesión/i });
    await expect(loginButton).toBeVisible();
  });
});
