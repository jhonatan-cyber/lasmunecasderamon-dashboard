import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BusinessError } from '@/lib/errors/errors';

const h = vi.hoisted(() => {
  const eventos: string[] = [];
  let secuencia = 0;
  return {
    eventos,
    reiniciar: () => {
      eventos.length = 0;
      secuencia = 0;
    },
    uuid: () => `id-${++secuencia}`,
    operacion: (nombre: string, resultado: unknown = undefined) =>
      vi.fn(async () => {
        eventos.push(nombre);
        return resultado;
      })
  };
});

vi.mock('@/lib/database/db', () => ({ generateUUID: h.uuid }));
vi.mock('@/lib/utils/ids', () => ({ generateUUID: h.uuid }));
vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-10-15 10:00:00'
}));
vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: vi.fn() }));
vi.mock('@/modules/caja', () => ({
  obtenerCajaActiva: h.operacion('caja', 'caja-1'),
  registrarMovimientoCobro: h.operacion('movimiento-caja')
}));
vi.mock('@/modules/clientes', () => ({
  consumirPrepagoVenta: h.operacion('prepago', 15_000),
  saldoPrepagoAgotado: h.operacion('saldo-agotado', true)
}));
vi.mock('@/modules/inventario', () => ({ consumirStockBar: h.operacion('stock', []) }));
vi.mock('@/modules/personal', () => ({ registrarComisionesServicio: h.operacion('comisiones') }));
vi.mock('@/modules/identidad', () => ({
  validarAnfitrionasEnLocal: h.operacion('validar-local', ['a', 'b']),
  ocuparAnfitrionasServicio: h.operacion('ocupar-anfitrionas'),
  comprobarAnfitrionasLibresParaServicio: h.operacion('comprobar-libres')
}));
vi.mock('@/modules/operacion/cuentas/servicio', () => ({
  cerrarCuentasPrepagoSaldadas: h.operacion('cerrar-prepago')
}));
vi.mock('@/modules/operacion/facturacion/servicio', () => ({
  ocuparHabitacionVenta: h.operacion('ocupar-habitacion'),
  pausarConflictosServicio: h.operacion('pausar')
}));
vi.mock('@/modules/operacion/servicios/asignaciones', () => ({
  obtenerServicioParaConsumo: h.operacion('original'),
  cambiarAnfitrionasServicioEnUnidad: h.operacion('cambiar-original')
}));
vi.mock('@/modules/operacion/servicios/repositorio', () => ({
  validarHabitacionDisponibleParaServicio: h.operacion('habitacion-servicio', {
    precio: 100,
    comision_anfitriona: 5,
    estado: 1
  }),
  marcarPausaServicio: h.operacion('pausar-original'),
  leerAdicionalActivo: h.operacion('adicional', null),
  insertarServicio: h.operacion('cabecera-servicio'),
  insertarDetallesServicio: h.operacion('detalles-servicio'),
  insertarClientesServicio: h.operacion('clientes-servicio'),
  actualizarCamposServicio: vi.fn(),
  leerImportesServicio: vi.fn()
}));

import { crearServicioEnUnidad } from '@/modules/operacion/servicios/creacion';
import { cerrarCuentasPrepagoSaldadas } from '@/modules/operacion/cuentas/servicio';
import { consumirPrepagoVenta, saldoPrepagoAgotado } from '@/modules/clientes';
import { registrarMovimientoCobro } from '@/modules/caja';
import { insertarServicio } from '@/modules/operacion/servicios/repositorio';

const contexto = { id: 'unidad-existente' };
const tareas: Array<() => void | Promise<void>> = [];
const aplazar = (tarea: () => void | Promise<void>) => {
  h.eventos.push('aplazar');
  tareas.push(tarea);
};

const servicioBase = {
  cliente_id: null,
  clientes: ['cliente-a', 'cliente-b'],
  habitacion_id: 'hab',
  producto_incluido_presentacion_id: 'incluido',
  precio_habitacion: 0,
  precio_servicio: 50_000,
  iva: 0,
  sub_total: 50_000,
  total: 50_000,
  tiempo: 30,
  metodo_pago: 'prepago' as const,
  usuarios: ['a', 'b']
};

const ordenBase = ['habitacion-servicio', 'comprobar-libres', 'caja'];

beforeEach(() => {
  h.reiniciar();
  tareas.length = 0;
  vi.clearAllMocks();
});

describe('destinos prepago en la creacion de servicios', () => {
  it('reparte mitad y mitad: consulta y cierra la cuenta de cada cliente tocado', async () => {
    await crearServicioEnUnidad(
      {
        ...servicioBase,
        prepago_destinos: [
          { cliente_id: 'cliente-a', monto: 25_000 },
          { cliente_id: 'cliente-b', monto: 25_000 }
        ]
      },
      'cajero',
      contexto,
      aplazar
    );

    expect(vi.mocked(consumirPrepagoVenta).mock.calls.map(c => c[0].clienteId)).toEqual([
      'cliente-a',
      'cliente-b'
    ]);
    expect(vi.mocked(consumirPrepagoVenta).mock.calls.map(c => c[0].prepagoSolicitado)).toEqual([
      25_000, 25_000
    ]);
    expect(vi.mocked(consumirPrepagoVenta).mock.calls.every(c => c[1] === contexto)).toBe(true);

    expect(vi.mocked(saldoPrepagoAgotado).mock.calls.map(c => c[0])).toEqual([
      'cliente-a',
      'cliente-b'
    ]);
    expect(vi.mocked(cerrarCuentasPrepagoSaldadas).mock.calls.map(c => c[0])).toEqual([
      'cliente-a',
      'cliente-b'
    ]);

    // Caja: prepago consumido = 15.000 + 15.000; el resto del metodo simple no va a efectivo.
    expect(registrarMovimientoCobro).toHaveBeenCalledWith(
      'caja-1',
      expect.objectContaining({
        servicio: 50_000,
        efectivo: 0,
        tarjeta: 0,
        transferencia: 0,
        prepago: 30_000,
        iva: 0
      }),
      contexto
    );
    expect(h.eventos).toEqual([
      ...ordenBase,
      'prepago',
      'prepago',
      'saldo-agotado',
      'cerrar-prepago',
      'saldo-agotado',
      'cerrar-prepago',
      'cabecera-servicio',
      'stock',
      'ocupar-habitacion',
      'validar-local',
      'pausar',
      'comisiones',
      'detalles-servicio',
      'ocupar-anfitrionas',
      'clientes-servicio',
      'movimiento-caja',
      'aplazar'
    ]);
  });

  it('la validacion del destino ocurre antes de consumir: rechaza un cliente fuera del servicio', async () => {
    await expect(
      crearServicioEnUnidad(
        {
          ...servicioBase,
          prepago_destinos: [{ cliente_id: 'intruso', monto: 25_000 }]
        },
        'cajero',
        contexto,
        aplazar
      )
    ).rejects.toMatchObject({
      code: 'PREPAGO_DESTINO_INVALIDO',
      message: 'El descuento de saldo solo puede aplicarse a clientes del servicio'
    });
    expect(consumirPrepagoVenta).not.toHaveBeenCalled();
    expect(insertarServicio).not.toHaveBeenCalled();
    expect(h.eventos).toEqual(ordenBase);
    expect(tareas).toHaveLength(0);
  });

  it('saldo insuficiente corta la unidad sin insertar ni cobrar', async () => {
    vi.mocked(consumirPrepagoVenta).mockImplementationOnce(async entrada => {
      h.eventos.push('prepago');
      throw new BusinessError('Saldo insuficiente', 'SALDO_INSUFICIENTE');
    });

    await expect(
      crearServicioEnUnidad(
        {
          ...servicioBase,
          prepago_destinos: [
            { cliente_id: 'cliente-a', monto: 25_000 },
            { cliente_id: 'cliente-b', monto: 25_000 }
          ]
        },
        'cajero',
        contexto,
        aplazar
      )
    ).rejects.toMatchObject({ code: 'SALDO_INSUFICIENTE' });

    expect(consumirPrepagoVenta).toHaveBeenCalledTimes(1);
    expect(insertarServicio).not.toHaveBeenCalled();
    expect(registrarMovimientoCobro).not.toHaveBeenCalled();
    expect(cerrarCuentasPrepagoSaldadas).not.toHaveBeenCalled();
    expect(h.eventos).toEqual([...ordenBase, 'prepago']);
    expect(tareas).toHaveLength(0);
  });

  it('sin destinos conserva la lectura historica de saldo automatico del titular', async () => {
    vi.mocked(consumirPrepagoVenta).mockResolvedValueOnce(50_000);
    await crearServicioEnUnidad(
      {
        ...servicioBase,
        clientes: [],
        cliente_id: 'cliente-a',
        prepago_destinos: undefined
      },
      'cajero',
      contexto,
      aplazar
    );
    expect(consumirPrepagoVenta).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ clienteId: 'cliente-a', prepagoSolicitado: null }),
      contexto
    );
    expect(saldoPrepagoAgotado).toHaveBeenCalledExactlyOnceWith('cliente-a', contexto);
    expect(vi.mocked(cerrarCuentasPrepagoSaldadas).mock.calls.map(c => c[0])).toEqual([
      'cliente-a'
    ]);
  });

  it('destinos vacios explicitos no descuentan saldo aunque haya titular', async () => {
    await crearServicioEnUnidad(
      {
        ...servicioBase,
        cliente_id: 'cliente-a',
        prepago_destinos: []
      },
      'cajero',
      contexto,
      aplazar
    );

    expect(consumirPrepagoVenta).not.toHaveBeenCalled();
    expect(saldoPrepagoAgotado).not.toHaveBeenCalled();
    expect(cerrarCuentasPrepagoSaldadas).not.toHaveBeenCalled();
    expect(registrarMovimientoCobro).toHaveBeenCalledWith(
      'caja-1',
      expect.objectContaining({ prepago: 0 }),
      contexto
    );
  });
});
