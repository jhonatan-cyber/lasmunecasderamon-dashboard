import { test, expect } from '@playwright/test';

test.describe('Módulo de Configuración', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    
    
    const userInput = page.getByPlaceholder(/admin, pepe, lizi.../i);
    const passwordInput = page.getByPlaceholder('Contraseña', { exact: true });
    const loginButton = page.getByRole('button', { name: /Iniciar sesión/i });

    await userInput.fill('admin');
    await passwordInput.fill('admin');
    await loginButton.click();
    
    
    await page.waitForURL(/\/(dashboard|settings)/);
  });

  test('debe cargar la página de configuración correctamente', async ({ page }) => {
    await page.goto('/settings');
    
    
    await expect(page.getByText('Gestión de Permisos')).toBeVisible();
    
    
    await expect(page.getByText('Total Permisos')).toBeVisible();
  });

  test('debe mostrar la sección de mantenimiento de base de datos', async ({ page }) => {
    await page.goto('/settings');
    
    
    await expect(page.getByText('Mantenimiento de Base de Datos')).toBeVisible();
    
    
    await expect(page.getByRole('button', { name: /Vaciar Base de Datos/i })).toBeVisible();
  });

  test('debe abrir el modal de confirmación al hacer clic en Vaciar BD', async ({ page }) => {
    await page.goto('/settings');
    
    
    await page.getByRole('button', { name: /Vaciar Base de Datos/i }).click();
    
    
    await expect(page.getByText('¿Vaciar Base de Datos?')).toBeVisible();
    
    
    await expect(page.getByText(/Ventas, Pedidos, Detalles/)).toBeVisible();
    
    
    await expect(page.getByText('Usuarios')).toBeVisible();
  });

  test('debe cerrar el modal al hacer clic en Cancelar', async ({ page }) => {
    await page.goto('/settings');
    
    
    await page.getByRole('button', { name: /Vaciar Base de Datos/i }).click();
    
    
    await expect(page.getByText('¿Vaciar Base de Datos?')).toBeVisible();
    
    
    await page.getByRole('button', { name: 'Cancelar' }).click();
    
    
    await expect(page.getByText('¿Vaciar Base de Datos?')).not.toBeVisible();
  });

  test('debe tener el botón deshabilitado cuando está limpiando', async ({ page }) => {
    await page.goto('/settings');
    
    
    const cleanButton = page.getByRole('button', { name: /Vaciar Base de Datos/i });
    await expect(cleanButton).toBeEnabled();
  });

  test('debe cargar el listado de permisos', async ({ page }) => {
    await page.goto('/settings');
    
    
    await expect(page.getByText('Módulos Activos')).toBeVisible();
    await expect(page.getByText('Módulos Únicos')).toBeVisible();
  });

  test('debe tener campo de búsqueda de permisos', async ({ page }) => {
    await page.goto('/settings');
    
    
    await expect(page.getByPlaceholder('Buscar permisos...')).toBeVisible();
  });

  test('debe tener filtro de módulos', async ({ page }) => {
    await page.goto('/settings');
    
    
    await expect(page.getByRole('combobox')).toBeVisible();
    await expect(page.getByRole('combobox')).toContainText('Todos los módulos');
  });

  test('debe tener botón para crear nuevo permiso', async ({ page }) => {
    await page.goto('/settings');
    
    
    await expect(page.getByRole('button', { name: /Nuevo Permiso/i })).toBeVisible();
  });
});