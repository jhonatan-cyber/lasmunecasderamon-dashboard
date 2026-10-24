import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El alta y la edición de cuentas son otro camino de venta: la API de cuentas
 * aceptaba la champaña al precio que mandara el cliente aunque no tuviera tabla
 * de precios por anfitrionas. La unidad de cuenta ahora la valida antes de
 * escribir la cabecera o de acumular consumos.
 */

const mocks = vi.hoisted(() => ({
  validar: vi.fn(),
  insertarCuentaBase: vi.fn(),
  agregarDetallesCuenta: vi.fn(),
  acumularTotalesCuenta: vi.fn()
}));

vi.mock('@/lib/transaction/contract', () => ({
  enUnaUnidad: (operacion: any) =>
    operacion({
      id: 'unidad',
      abierta: true,
      ejecutar: (op: any) => op({ id: 'unidad' })
    })
}));

vi.mock('@/lib/transaction/effects', () => ({
  ejecutarEfectosConfirmados: vi.fn(async () => undefined)
}));

vi.mock('@/lib/database/db', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, generateUUID: () => 'cuenta-nueva' };
});

vi.mock('@/lib/business/timezoneService', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, getNowInBusinessTimezone: () => '2026-01-01 10:00:00' };
});

vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: vi.fn() }));

vi.mock('@/modules/operacion/cuentas/repositorio', () => ({
  insertarCuentaBase: mocks.insertarCuentaBase,
  agregarDetallesCuenta: mocks.agregarDetallesCuenta,
  reemplazarUsuariosCuenta: vi.fn(),
  reescribirHistorialAlta: vi.fn(),
  leerHabitacionParaCuenta: vi.fn(),
  leerNombreCliente: vi.fn(),
  acumularTotalesCuenta: mocks.acumularTotalesCuenta,
  leerCuentaParaTiempo: vi.fn(),
  leerCuentaParaCambio: vi.fn(),
  marcarEstadoCuenta: vi.fn(),
  actualizarTiempoCuenta: vi.fn(),
  actualizarHabitacionCuenta: vi.fn(),
  leerNombreHabitacion: vi.fn(),
  leerNombreClienteCuenta: vi.fn()
}));

vi.mock('@/modules/operacion/facturacion/servicio', () => ({
  ocuparHabitacionSiCorresponde: vi.fn(),
  liberarHabitacionPorAnulacion: vi.fn()
}));

vi.mock('@/modules/inventario/bar/validarChampana', () => ({
  validarChampanaConfigurada: mocks.validar
}));

import { BusinessError } from '@/lib/errors/errors';
import { MENSAJE_CHAMPAGNE_SIN_CONFIGURAR } from '@/lib/business/champagne';
import { crearCuenta } from '@/modules/operacion/cuentas/alta';
import { actualizarCuenta } from '@/modules/operacion/cuentas/actualizacion';

const detalles = [
  { producto_id: 'prod-champ', precio: 120000, cantidad: 1, sub_total: 120000, comision: 40000 }
];

const altaBase = {
  codigo: 'C-001',
  total_comision: 40000,
  sub_total: 120000,
  total: 120000,
  detalles
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('cuentas y champaña sin configurar', () => {
  it('crear una cuenta rechaza la champaña antes de escribir la cabecera', async () => {
    mocks.validar.mockRejectedValueOnce(new BusinessError(MENSAJE_CHAMPAGNE_SIN_CONFIGURAR));

    await expect(crearCuenta(altaBase as any, 'user-1')).rejects.toThrow(
      MENSAJE_CHAMPAGNE_SIN_CONFIGURAR
    );

    expect(mocks.validar).toHaveBeenCalledWith(detalles, { id: 'unidad' });
    expect(mocks.insertarCuentaBase).not.toHaveBeenCalled();
    expect(mocks.agregarDetallesCuenta).not.toHaveBeenCalled();
  });

  it('agregar consumos rechaza la champaña antes de acumular totales', async () => {
    mocks.validar.mockRejectedValueOnce(new BusinessError(MENSAJE_CHAMPAGNE_SIN_CONFIGURAR));

    await expect(actualizarCuenta('cuenta-1', { detalles } as any, 'user-1')).rejects.toThrow(
      MENSAJE_CHAMPAGNE_SIN_CONFIGURAR
    );

    expect(mocks.validar).toHaveBeenCalledWith(detalles, { id: 'unidad' });
    expect(mocks.acumularTotalesCuenta).not.toHaveBeenCalled();
    expect(mocks.agregarDetallesCuenta).not.toHaveBeenCalled();
  });

  it('con la champaña configurada la cuenta se escribe igual', async () => {
    mocks.validar.mockResolvedValue(undefined);

    await expect(crearCuenta(altaBase as any, 'user-1')).resolves.toBe('cuenta-nueva');

    expect(mocks.validar).toHaveBeenCalledTimes(1);
    expect(mocks.insertarCuentaBase).toHaveBeenCalledTimes(1);
    expect(mocks.agregarDetallesCuenta).toHaveBeenCalledTimes(1);
  });
});
