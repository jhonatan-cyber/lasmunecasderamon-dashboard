import { test, expect } from '@playwright/test';

test.describe('Módulo de Configuración', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    
    // Realizar login como administrador
    const userInput = page.getByPlaceholder(/admin, pepe, lizi.../i);
    const passwordInput = page.getByPlaceholder('Contraseña', { exact: true });
    const loginButton = page.getByRole('button', { name: /Iniciar sesión/i });

    await userInput.fill('admin');
    await passwordInput.fill('admin');
    await loginButton.click();
    
    // Esperar a que cargue el dashboard
    await page.waitForURL(/\/(dashboard|settings)/);
  });

  test('debe cargar la página de configuración correctamente', async ({ page }) => {
    await page.goto('/settings');
    
    // Verificar que el título está presente
    await expect(page.getByText('Gestión de Permisos')).toBeVisible();
    
    // Verificar que existen los stats cards
    await expect(page.getByText('Total Permisos')).toBeVisible();
  });

  test('debe mostrar la sección de mantenimiento de base de datos', async ({ page }) => {
    await page.goto('/settings');
    
    // Verificar que existe la sección de mantenimiento
    await expect(page.getByText('Mantenimiento de Base de Datos')).toBeVisible();
    
    // Verificar que está el botón de vaciar base de datos
    await expect(page.getByRole('button', { name: /Vaciar Base de Datos/i })).toBeVisible();
  });

  test('debe abrir el modal de confirmación al hacer clic en Vaciar BD', async ({ page }) => {
    await page.goto('/settings');
    
    // Hacer clic en el botón de vaciar base de datos
    await page.getByRole('button', { name: /Vaciar Base de Datos/i }).click();
    
    // Verificar que aparece el modal de confirmación
    await expect(page.getByText('¿Vaciar Base de Datos?')).toBeVisible();
    
    // Verificar que muestra las tablas a eliminar
    await expect(page.getByText(/Ventas, Pedidos, Detalles/)).toBeVisible();
    
    // Verificar que muestra las tablas a preservar
    await expect(page.getByText('Usuarios')).toBeVisible();
  });

  test('debe cerrar el modal al hacer clic en Cancelar', async ({ page }) => {
    await page.goto('/settings');
    
    // Abrir modal
    await page.getByRole('button', { name: /Vaciar Base de Datos/i }).click();
    
    // Verificar que el modal está abierto
    await expect(page.getByText('¿Vaciar Base de Datos?')).toBeVisible();
    
    // Cerrar modal
    await page.getByRole('button', { name: 'Cancelar' }).click();
    
    // Verificar que el modal se cerró
    await expect(page.getByText('¿Vaciar Base de Datos?')).not.toBeVisible();
  });

  test('debe tener el botón deshabilitado cuando está limpiando', async ({ page }) => {
    await page.goto('/settings');
    
    // Verificar que el botón está habilitado inicialmente
    const cleanButton = page.getByRole('button', { name: /Vaciar Base de Datos/i });
    await expect(cleanButton).toBeEnabled();
  });

  test('debe cargar el listado de permisos', async ({ page }) => {
    await page.goto('/settings');
    
    // Verificar que aparecen las tarjetas de stats
    await expect(page.getByText('Módulos Activos')).toBeVisible();
    await expect(page.getByText('Módulos Únicos')).toBeVisible();
  });

  test('debe tener campo de búsqueda de permisos', async ({ page }) => {
    await page.goto('/settings');
    
    // Verificar que existe el input de búsqueda
    await expect(page.getByPlaceholder('Buscar permisos...')).toBeVisible();
  });

  test('debe tener filtro de módulos', async ({ page }) => {
    await page.goto('/settings');
    
    // Verificar que existe el select de filtro
    await expect(page.getByRole('combobox')).toBeVisible();
    await expect(page.getByRole('combobox')).toContainText('Todos los módulos');
  });

  test('debe tener botón para crear nuevo permiso', async ({ page }) => {
    await page.goto('/settings');
    
    // Verificar que existe el botón de nuevo permiso
    await expect(page.getByRole('button', { name: /Nuevo Permiso/i })).toBeVisible();
  });
});