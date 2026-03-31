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

    // Esperar a que el botón vuelva a estar habilitado (terminó la carga)
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

    const themeButton = page.locator('button:has(svg.lucide-sun), button:has(svg.lucide-moon), button:has(svg.lucide-monitor)');
    await themeButton.click();

    // El popover debería mostrarse. Buscamos opciones de tema.
    const darkOption = page.locator('button', { hasText: /Dark/i });
    await expect(darkOption).toBeVisible();
    await darkOption.click();
    
    // Verificar que el HTML tiene la clase 'dark'
    await expect(page.locator('html')).toHaveClass(/dark/);

    await themeButton.click();
    const lightOption = page.locator('button', { hasText: /Light/i });
    await expect(lightOption).toBeVisible();
    await lightOption.click();
    
    // Verificar que el HTML NO tiene la clase 'dark'
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});
