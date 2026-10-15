import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/modules/clientes/prepago/repositorio', () => ({
  guardarRecargaPrepago: vi.fn(),
  leerSaldoParaActualizar: vi.fn(),
  guardarConsumoCuenta: vi.fn(),
  guardarDevolucionSaldo: vi.fn(),
  saldoClienteAgotado: vi.fn(),
  guardarRestitucionPrepago: vi.fn()
}));
import {
  guardarRecargaPrepago,
  leerSaldoParaActualizar,
  guardarConsumoCuenta,
  guardarDevolucionSaldo,
  saldoClienteAgotado,
  guardarRestitucionPrepago
} from '@/modules/clientes/prepago/repositorio';
import {
  registrarRecargaEnUnidad,
  consumirPrepagoCuenta,
  devolverSaldoEnUnidad,
  restituirPrepagoPorAnulacion
} from '@/modules/clientes/prepago/servicio';

const guardar = vi.mocked(guardarRecargaPrepago);
const contexto = { id: 'unidad-existente' };
const entrada = { cliente_id: 'cliente', monto: 100, metodo_pago: 'tarjeta' };

beforeEach(() => {
  vi.resetAllMocks();
});

describe('recarga dentro de una unidad existente', () => {
  it('entrega al repositorio la misma unidad y devuelve los deltas preparados', async () => {
    guardar.mockResolvedValue(undefined);
    expect(await registrarRecargaEnUnidad(entrada, contexto)).toEqual({
      efectivo: 0,
      tarjeta: 100,
      transferencia: 0,
      prepago: 0
    });
    expect(guardar).toHaveBeenCalledExactlyOnceWith(
      entrada,
      {
        metodoPago: 'tarjeta',
        metadatos: null,
        deltas: { efectivo: 0, tarjeta: 100, transferencia: 0, prepago: 0 }
      },
      contexto
    );
  });
  it('rechaza pagos mixtos invalidos antes de escribir', async () => {
    await expect(
      registrarRecargaEnUnidad(
        { ...entrada, metodo_pago: 'mixto', pagos_mixtos: [{ metodo: 'tarjeta', monto: 100 }] },
        contexto
      )
    ).rejects.toThrow('al menos 2 metodos');
    expect(guardar).not.toHaveBeenCalled();
  });
  it('propaga el fallo de persistencia para que la unidad haga rollback', async () => {
    const error = new Error('fallo de persistencia');
    guardar.mockRejectedValue(error);
    await expect(registrarRecargaEnUnidad(entrada, contexto)).rejects.toBe(error);
  });
});

describe('consumo de cuentas en la misma unidad', () => {
  it('lee con bloqueo antes de descontar el monto exacto', async () => {
    vi.mocked(leerSaldoParaActualizar).mockResolvedValue({ saldo: 100 });
    await consumirPrepagoCuenta('cliente', 60, contexto);
    expect(leerSaldoParaActualizar).toHaveBeenCalledExactlyOnceWith('cliente', contexto);
    expect(guardarConsumoCuenta).toHaveBeenCalledExactlyOnceWith('cliente', 60, contexto);
    expect(vi.mocked(leerSaldoParaActualizar).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(guardarConsumoCuenta).mock.invocationCallOrder[0]
    );
  });
  it.each([undefined, { saldo: null }, { saldo: 30 }])(
    'rechaza saldo insuficiente %j sin escribir',
    async fila => {
      vi.mocked(leerSaldoParaActualizar).mockResolvedValue(fila);
      await expect(consumirPrepagoCuenta(null, 60, contexto)).rejects.toMatchObject({
        message: 'Saldo insuficiente',
        code: 'SALDO_INSUFICIENTE',
        statusCode: 422
      });
      expect(guardarConsumoCuenta).not.toHaveBeenCalled();
    }
  );
  it.each([0, -10, 12.5])('no cambia la validacion historica del monto %s', async monto => {
    vi.mocked(leerSaldoParaActualizar).mockResolvedValue({ saldo: 100 });
    await consumirPrepagoCuenta('cliente', monto, contexto);
    expect(guardarConsumoCuenta).toHaveBeenCalledExactlyOnceWith('cliente', monto, contexto);
  });
  it('propaga un fallo del descuento a la unidad', async () => {
    vi.mocked(leerSaldoParaActualizar).mockResolvedValue({ saldo: 100 });
    const error = new Error('fallo al descontar');
    vi.mocked(guardarConsumoCuenta).mockRejectedValue(error);
    await expect(consumirPrepagoCuenta('cliente', 60, contexto)).rejects.toBe(error);
  });
});

describe('devolucion de saldo en la misma unidad', () => {
  const devolucion = { cliente_id: 'cliente', monto: 60, motivo: ' retiro ' };
  it.each([0, -1, NaN])('rechaza monto %s antes de leer o escribir', async monto => {
    await expect(devolverSaldoEnUnidad({ ...devolucion, monto }, contexto)).rejects.toMatchObject({
      code: 'MONTO_INVALIDO',
      message: 'Monto de devolucion invalido'
    });
    expect(leerSaldoParaActualizar).not.toHaveBeenCalled();
    expect(guardarDevolucionSaldo).not.toHaveBeenCalled();
  });
  it('rechaza cliente vacio antes de tomar el bloqueo', async () => {
    await expect(
      devolverSaldoEnUnidad({ ...devolucion, cliente_id: '' }, contexto)
    ).rejects.toMatchObject({ code: 'MONTO_INVALIDO' });
    expect(leerSaldoParaActualizar).not.toHaveBeenCalled();
  });
  it('conserva el error original de cliente inexistente', async () => {
    vi.mocked(leerSaldoParaActualizar).mockResolvedValue(undefined);
    await expect(devolverSaldoEnUnidad(devolucion, contexto)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
      message: 'Cliente no encontrado no encontrado'
    });
    expect(guardarDevolucionSaldo).not.toHaveBeenCalled();
  });
  it('conserva el mensaje y codigo de saldo insuficiente', async () => {
    vi.mocked(leerSaldoParaActualizar).mockResolvedValue({ saldo: 30 });
    await expect(devolverSaldoEnUnidad(devolucion, contexto)).rejects.toMatchObject({
      code: 'SALDO_INSUFICIENTE',
      message: 'Saldo insuficiente. Disponible: $30'
    });
    expect(guardarDevolucionSaldo).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    'devuelve el estado saldado %s consultado despues de escribir',
    async saldado => {
      vi.mocked(leerSaldoParaActualizar).mockResolvedValue({ saldo: 100 });
      vi.mocked(saldoClienteAgotado).mockResolvedValue(saldado);
      expect(await devolverSaldoEnUnidad(devolucion, contexto)).toBe(saldado);
      expect(leerSaldoParaActualizar).toHaveBeenCalledExactlyOnceWith('cliente', contexto);
      expect(guardarDevolucionSaldo).toHaveBeenCalledExactlyOnceWith(
        devolucion,
        { monto: 60, motivo: 'retiro' },
        contexto
      );
      expect(saldoClienteAgotado).toHaveBeenCalledExactlyOnceWith('cliente', contexto);
      expect(vi.mocked(leerSaldoParaActualizar).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(guardarDevolucionSaldo).mock.invocationCallOrder[0]
      );
      expect(vi.mocked(guardarDevolucionSaldo).mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(saldoClienteAgotado).mock.invocationCallOrder[0]
      );
    }
  );
  it('no consulta el saldo final si falla la persistencia', async () => {
    vi.mocked(leerSaldoParaActualizar).mockResolvedValue({ saldo: 100 });
    const error = new Error('fallo al devolver');
    vi.mocked(guardarDevolucionSaldo).mockRejectedValue(error);
    await expect(devolverSaldoEnUnidad(devolucion, contexto)).rejects.toBe(error);
    expect(saldoClienteAgotado).not.toHaveBeenCalled();
  });
});

describe('restitucion por anulacion', () => {
  const restitucion = {
    clienteId: 'cliente',
    ventaId: 'venta',
    monto: 10.6,
    concepto: 'anulacion'
  };
  it('conserva el redondeo antes de persistir', async () => {
    await restituirPrepagoPorAnulacion(restitucion, contexto);
    expect(guardarRestitucionPrepago).toHaveBeenCalledExactlyOnceWith(
      { ...restitucion, monto: 11 },
      contexto
    );
  });
  it.each([0, -1, 0.4])(
    'omite restituciones sin monto positivo tras redondear: %s',
    async monto => {
      await restituirPrepagoPorAnulacion({ ...restitucion, monto }, contexto);
      expect(guardarRestitucionPrepago).not.toHaveBeenCalled();
    }
  );
});
