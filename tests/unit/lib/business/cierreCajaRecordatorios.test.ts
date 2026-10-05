import { beforeEach, describe, expect, it, vi } from 'vitest';

const pendientesMock = vi.hoisted(() => vi.fn());
const getByIdMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());
const avisarMock = vi.hoisted(() => vi.fn());
const errorMock = vi.hoisted(() => vi.fn());
const capturarMock = vi.hoisted(() => vi.fn());

vi.mock('@/modules/caja/turnos/servicio', () => ({
  CashRegisterService: {
    cierresPendientesParaRecordar: pendientesMock,
    getById: getByIdMock,
    registrarAvisoCierre: registrarMock
  }
}));
vi.mock('@/lib/api/cierreCaja', () => ({ avisarCierreAlAdministrador: avisarMock }));
vi.mock('@/lib/utils/logger', () => ({
  default: { error: errorMock, captureException: capturarMock }
}));

import { reavisarCierresPendientes } from '@/lib/business/cierreCajaRecordatorios';

const pendiente = (overrides: Record<string, unknown> = {}) => ({
  caja_id: 'caja-1',
  token: 'tok-1',
  solicitado_por: 'CajeroTest',
  motivo: 'Cierre de turno',
  monto_cierre_calculado: 172000,
  saldo_clientes_descontado: 12000,
  ultimo_aviso_en: '2026-09-29 03:00:00',
  ...overrides
});

/**
 * Reaviso automático: un cierre que quedó sin respuesta no puede olvidarse porque el cajero
 * se fue sin insistir. El cron llama a esta función; acá no hay cron ni base real.
 */
describe('recordatorio automático de cierres de caja sin respuesta', () => {
  beforeEach(() => {
    pendientesMock.mockReset();
    getByIdMock.mockReset();
    registrarMock.mockReset();
    avisarMock.mockReset();
    errorMock.mockReset();
    capturarMock.mockReset();

    pendientesMock.mockResolvedValue([]);
    getByIdMock.mockResolvedValue({ id_caja: 'caja-1', estado: 1 });
    registrarMock.mockResolvedValue('2026-09-29 03:20:00');
    avisarMock.mockResolvedValue(undefined);
  });

  it('sin cierres vencidos no avisa nada', async () => {
    expect(await reavisarCierresPendientes()).toBe(0);
    expect(avisarMock).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it('reavisa con el mismo token y sella el aviso después de que el WhatsApp sale', async () => {
    pendientesMock.mockResolvedValue([pendiente()]);

    expect(await reavisarCierresPendientes()).toBe(1);

    expect(avisarMock).toHaveBeenCalledOnce();
    expect(avisarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cajaId: 'caja-1',
        token: 'tok-1',
        cajeroNombre: 'CajeroTest',
        montoCierre: 172000,
        saldoClientes: 12000,
        reenvio: true
      })
    );
    // El sello va después del envío: un fallo de Twilio no puede contar como aviso dado.
    expect(avisarMock.mock.invocationCallOrder[0]).toBeLessThan(
      registrarMock.mock.invocationCallOrder[0]
    );
    expect(registrarMock).toHaveBeenCalledWith('tok-1');
  });

  it('si la caja ya no está abierta se saltea sin sellar', async () => {
    pendientesMock.mockResolvedValue([pendiente()]);
    getByIdMock.mockResolvedValue({ id_caja: 'caja-1', estado: 0 });

    expect(await reavisarCierresPendientes()).toBe(0);
    expect(avisarMock).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it('un WhatsApp que falla no corta los demás cierres ni cuenta como aviso dado', async () => {
    pendientesMock.mockResolvedValue([
      pendiente({ caja_id: 'caja-1', token: 'tok-1' }),
      pendiente({ caja_id: 'caja-2', token: 'tok-2' })
    ]);
    avisarMock.mockRejectedValueOnce(new Error('sin twilio'));

    expect(await reavisarCierresPendientes()).toBe(1);

    expect(errorMock).toHaveBeenCalledOnce();
    // La que falló no se selló; la segunda sí.
    expect(registrarMock).toHaveBeenCalledTimes(1);
    expect(registrarMock).toHaveBeenCalledWith('tok-2');
  });

  it('un fallo del repositorio no lanza: el cron sigue vivo', async () => {
    pendientesMock.mockRejectedValue(new Error('sin base'));

    expect(await reavisarCierresPendientes()).toBe(0);
    expect(capturarMock).toHaveBeenCalledOnce();
  });
});
