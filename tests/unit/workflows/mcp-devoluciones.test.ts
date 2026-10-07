// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  reclamar: vi.fn(),
  devolver: vi.fn(),
  resolver: vi.fn(),
  cerrar: vi.fn(),
  events: [] as string[]
}));
vi.mock('@/lib/transaccion/contrato', () => ({
  enUnaUnidad: async (fn: any) => {
    mocks.events.push('begin');
    try {
      const result = await fn({ ejecutar: (operation: any) => operation({ id: 'tx' }) });
      mocks.events.push('commit');
      return result;
    } catch (e) {
      mocks.events.push('rollback');
      throw e;
    }
  }
}));
vi.mock('@/modules/clientes', () => ({
  reclamarDevolucionSaldo: mocks.reclamar,
  devolverSaldoEnUnidad: mocks.devolver,
  resolverDevolucionEnUnidad: mocks.resolver,
  registrarRecargaEnUnidad: vi.fn()
}));
vi.mock('@/modules/operacion', () => ({
  cerrarCuentasPrepagoSaldadas: mocks.cerrar,
  crearCuentaPrepagoRecarga: vi.fn()
}));
vi.mock('@/modules/caja', () => ({
  obtenerCajaActiva: vi.fn(),
  registrarMovimientoCobro: vi.fn()
}));
import { resolverSolicitudDevolucion } from '@/workflows/prepago';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.events.length = 0;
  mocks.reclamar.mockResolvedValue({
    id: 's1',
    cliente_id: 'cliente',
    monto: 100,
    motivo: 'Saldo restante',
    estado: 'pendiente'
  });
  mocks.devolver.mockResolvedValue(false);
  mocks.resolver.mockResolvedValue(undefined);
});
describe('resolución atómica de devolución', () => {
  it('usa el mismo contexto para descuento y resolución, registrando al administrador', async () => {
    const result = await resolverSolicitudDevolucion('s1', 'aprobar', 'admin', 100);
    expect(mocks.reclamar).toHaveBeenCalledWith('s1', { id: 'tx' });
    expect(mocks.devolver).toHaveBeenCalledWith(
      { cliente_id: 'cliente', monto: 100, motivo: 'Saldo restante', usuario_id: 'admin' },
      { id: 'tx' }
    );
    expect(mocks.resolver).toHaveBeenCalledWith('s1', 'aprobada', 'admin', { id: 'tx' });
    expect(result.saldo_descontado).toBe(true);
    expect(mocks.events).toEqual(['begin', 'commit']);
  });
  it('rechazar no descuenta saldo', async () => {
    await resolverSolicitudDevolucion('s1', 'rechazar', 'admin', 100);
    expect(mocks.devolver).not.toHaveBeenCalled();
    expect(mocks.resolver).toHaveBeenCalledWith('s1', 'rechazada', 'admin', { id: 'tx' });
  });
  it('monto cambiado o saldo insuficiente no marcan la solicitud como aprobada', async () => {
    await expect(resolverSolicitudDevolucion('s1', 'aprobar', 'admin', 200)).rejects.toThrow(
      'El monto cambió'
    );
    expect(mocks.devolver).not.toHaveBeenCalled();
    expect(mocks.resolver).not.toHaveBeenCalled();
    mocks.devolver.mockRejectedValueOnce(new Error('Saldo insuficiente'));
    await expect(resolverSolicitudDevolucion('s1', 'aprobar', 'admin', 100)).rejects.toThrow(
      'Saldo insuficiente'
    );
    expect(mocks.resolver).not.toHaveBeenCalled();
    expect(mocks.events).toEqual(['begin', 'rollback', 'begin', 'rollback']);
  });
});
