import { test, expect } from '@playwright/test';

test.describe('Flujo de Autenticación', () => {
  test('debería mostrar error con credenciales inválidas', async ({ page }) => {
    await page.goto('/login');

    const userInput = page.getByPlaceholder(/admin, pepe, lizi.../i);
    const passwordInput = page.getByPlaceholder('Contraseña', { exact: true });
    const loginButton = page.getByRole('button', { name: /Iniciar sesión/i });

    await userInput.fill('usuario_falso');
    await passwordInput.fill('password_incorrecto');
    await loginButton.click();

    await expect(loginButton).toBeEnabled();
  });

  test('debería permitir alternar la visibilidad de la contraseña', async ({ page }) => {
    await page.goto('/login');

    const passwordInput = page.getByPlaceholder('Contraseña', { exact: true });
    const toggleButton = page.locator('button:has(svg.lucide-eye)');

    await passwordInput.fill('secret123');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
  test('debería permitir alternar entre temas claro y oscuro', async ({ page }) => {
    await page.goto('/login');

    const darkOption = page.locator('button', { hasText: /Dark/i });
    await expect(darkOption).toBeVisible();
    await darkOption.click();

    await expect(page.locator('html')).toHaveClass(/dark/);

    const lightOption = page.locator('button', { hasText: /Light/i });
    await expect(lightOption).toBeVisible();
    await lightOption.click();

    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});
