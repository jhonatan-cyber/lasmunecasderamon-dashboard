import { beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@/lib/database/db', () => ({ generateUUID: h.uuid, withTransaction: vi.fn() }));
vi.mock('@/lib/utils/ids', () => ({ generateUUID: h.uuid }));
vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-10-15 10:00:00'
}));
vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: vi.fn() }));
vi.mock('@/lib/business/shotAlerts', () => ({ notifyBarShotAlerts: vi.fn() }));
vi.mock('@/modules/operacion', () => ({
  prepararVentaPedido: vi.fn(async () => venta),
  obtenerServicioParaConsumo: h.operacion('original-venta'),
  consultarHabitacion: h.operacion('habitacion-venta', [
    { precio: 100, comision_anfitriona: 5, estado: 1 }
  ]),
  cambiarAnfitrionasServicioEnUnidad: h.operacion('cambiar-original-venta'),
  ocuparHabitacionVenta: h.operacion('ocupar-habitacion-venta'),
  cerrarPedidoFacturado: h.operacion('cerrar-pedido'),
  pausarConflictosVenta: h.operacion('pausar-venta'),
  cerrarCuentasPrepagoSaldadas: h.operacion('cerrar-prepago-venta')
}));
vi.mock('@/modules/identidad', () => ({
  validarAnfitrionasEnLocal: h.operacion('validar-local', ['a', 'b']),
  actualizarDisponibilidadTrasVenta: h.operacion('disponibilidad-venta'),
  ocuparAnfitrionasServicio: h.operacion('ocupar-anfitrionas'),
  comprobarAnfitrionasLibresParaServicio: h.operacion('comprobar-libres')
}));
vi.mock('@/modules/auditoria', () => ({ AuditService: { log: h.operacion('auditoria') } }));
vi.mock('@/modules/inventario', () => ({ consumirStockBar: h.operacion('stock', []) }));
vi.mock('@/modules/caja', () => ({
  obtenerCajaActiva: h.operacion('caja', 'caja-1'),
  registrarMovimientoCobro: h.operacion('movimiento-caja'),
  ajustarIvaCaja: vi.fn()
}));
vi.mock('@/modules/personal', () => ({
  registrarComisionesVenta: h.operacion('comisiones-venta'),
  registrarPropinaVenta: h.operacion('propina'),
  registrarComisionesServicio: h.operacion('comisiones-servicio')
}));
vi.mock('@/modules/clientes', () => ({
  consumirPrepagoVenta: h.operacion('prepago', 10),
  saldoPrepagoAgotado: h.operacion('saldo-agotado', true)
}));
vi.mock('@/modules/ventas', () => ({
  registrarCabeceraVenta: h.operacion('cabecera-venta'),
  registrarDetallesVenta: h.operacion('detalles-venta'),
  asignarAnfitrionasVenta: h.operacion('asignar-venta')
}));
vi.mock('@/modules/operacion/servicios/asignaciones', () => ({
  obtenerServicioParaConsumo: h.operacion('original', {
    es_temporal: 0,
    habitacion_id: 'hab',
    estado: 2
  }),
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
  leerIvaServicio: vi.fn()
}));
vi.mock('@/modules/operacion/cuentas/servicio', () => ({
  cerrarCuentasPrepagoSaldadas: h.operacion('cerrar-prepago-servicio')
}));
vi.mock('@/modules/operacion/facturacion/servicio', () => ({
  ocuparHabitacionVenta: h.operacion('ocupar-habitacion-servicio'),
  pausarConflictosServicio: h.operacion('pausar-servicio')
}));

import { registrarVenta } from '@/workflows/registrar-venta';
import { crearServicioEnUnidad } from '@/modules/operacion/servicios/creacion';
import { registrarDetallesVenta } from '@/modules/ventas';
import { registrarMovimientoCobro, obtenerCajaActiva } from '@/modules/caja';
import { consumirStockBar } from '@/modules/inventario';
import { registrarComisionesServicio } from '@/modules/personal';
import { obtenerServicioParaConsumo } from '@/modules/operacion/servicios/asignaciones';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { validarAnfitrionasEnLocal } from '@/modules/identidad';
import { insertarDetallesServicio } from '@/modules/operacion/servicios/repositorio';

const contexto = { id: 'unidad-existente' };
const venta = {
  cliente_id: 'cliente',
  pedido_id: 'pedido',
  habitacion_id: 'hab',
  tiempo: 30,
  total: 31,
  propina: 1,
  sub_total: 30,
  usuarios: ['a', 'b'],
  metodo_pago: 'mixto' as const,
  pagos_mixtos: [
    { metodo: 'prepago', monto: 10 },
    { metodo: 'tarjeta', monto: 21 }
  ],
  detalles: [
    { producto_id: 'producto', precio: 10, cantidad: 3, comision: 7, hostesses: ['a', 'b'] }
  ]
};
const servicio = {
  cliente_id: 'cliente',
  habitacion_id: 'hab',
  tiempo: 30,
  total: 201,
  iva: 1,
  sub_total: 200,
  precio_habitacion: 100,
  precio_servicio: 100,
  usuarios: ['a', 'b'],
  producto_incluido_presentacion_id: 'incluido',
  metodo_pago: 'mixto' as const,
  pagos_mixtos: [
    { metodo: 'prepago', monto: 10 },
    { metodo: 'tarjeta', monto: 191 }
  ]
};
const ordenVenta = [
  'caja',
  'prepago',
  'saldo-agotado',
  'cerrar-prepago-venta',
  'habitacion-venta',
  'cabecera-venta',
  'ocupar-habitacion-venta',
  'validar-local',
  'pausar-venta',
  'asignar-venta',
  'disponibilidad-venta',
  'detalles-venta',
  'stock',
  'comisiones-venta',
  'movimiento-caja',
  'auditoria',
  'cerrar-pedido',
  'propina',
  'aplazar'
];
const ordenServicio = [
  'habitacion-servicio',
  'comprobar-libres',
  'caja',
  'prepago',
  'saldo-agotado',
  'cerrar-prepago-servicio',
  'cabecera-servicio',
  'stock',
  'ocupar-habitacion-servicio',
  'validar-local',
  'pausar-servicio',
  'comisiones-servicio',
  'detalles-servicio',
  'ocupar-anfitrionas',
  'clientes-servicio',
  'movimiento-caja',
  'aplazar'
];
const tareas: Array<() => void | Promise<void>> = [];
const aplazar = (tarea: () => void | Promise<void>) => {
  h.eventos.push('aplazar');
  tareas.push(tarea);
};

beforeEach(() => {
  h.reiniciar();
  tareas.length = 0;
  vi.clearAllMocks();
});

describe('orden transaccional de ventas', () => {
  it('mantiene la secuencia, los repartos y los avisos aplazados', async () => {
    await registrarVenta(venta, 'cajero', contexto, aplazar);
    expect(h.eventos).toEqual(ordenVenta);
    expect(registrarDetallesVenta).toHaveBeenCalledWith(contexto, [
      expect.objectContaining({
        id_detalle_venta: 'id-2',
        cantidad: 1,
        comision: 3,
        sub_total: 10,
        hostess_id: 'a'
      }),
      expect.objectContaining({
        id_detalle_venta: 'id-5',
        cantidad: 2,
        comision: 4,
        sub_total: 20,
        hostess_id: 'b'
      })
    ]);
    expect(registrarMovimientoCobro).toHaveBeenCalledWith(
      'caja-1',
      {
        venta: 30,
        propina: 1,
        efectivo: 0,
        tarjeta: 21,
        transferencia: 0,
        prepago: 10,
        comision: 7
      },
      contexto
    );
    expect(sendNotificationToAll).not.toHaveBeenCalled();
    expect(tareas).toHaveLength(1);
    await tareas[0]();
    expect(sendNotificationToAll).toHaveBeenCalledWith(
      'updateSales',
      expect.objectContaining({ id: 'id-1' })
    );
  });
  it('el cobro con origen cuenta evita el segundo descuento y la segunda postulacion a caja', async () => {
    await registrarVenta({ ...venta, origen: 'cuenta' }, 'cajero', contexto, aplazar, {
      desdeCuenta: true
    });
    expect(h.eventos).toEqual(
      ordenVenta.filter(
        nombre =>
          !['prepago', 'saldo-agotado', 'cerrar-prepago-venta', 'movimiento-caja'].includes(nombre)
      )
    );
  });
  it('un fallo de stock corta antes de comisiones, caja, auditoria y avisos', async () => {
    const error = new Error('sin stock');
    vi.mocked(consumirStockBar).mockImplementationOnce(async () => {
      h.eventos.push('stock');
      throw error;
    });
    await expect(registrarVenta(venta, 'cajero', contexto, aplazar)).rejects.toBe(error);
    expect(h.eventos).toEqual(ordenVenta.slice(0, ordenVenta.indexOf('stock') + 1));
    expect(tareas).toEqual([]);
  });
});

describe('orden transaccional de creacion de servicios', () => {
  it('mantiene prepago, inventario, disponibilidad, comisiones y caja en su orden', async () => {
    await crearServicioEnUnidad(servicio, 'cajero', contexto, aplazar);
    expect(h.eventos).toEqual(ordenServicio);
    expect(registrarComisionesServicio).toHaveBeenCalledWith(
      [expect.objectContaining({ id_comision: 'id-2', monto: 5 })],
      [
        expect.objectContaining({ id_detalle_comision: 'id-3', usuario_id: 'a', comision: 3 }),
        expect.objectContaining({ id_detalle_comision: 'id-5', usuario_id: 'b', comision: 2 })
      ],
      contexto
    );
    expect(insertarDetallesServicio).toHaveBeenCalledWith(
      [
        expect.objectContaining({ id_detalle_servicio: 'id-4', comision: 3 }),
        expect.objectContaining({ id_detalle_servicio: 'id-6', comision: 2 })
      ],
      contexto
    );
    expect(registrarMovimientoCobro).toHaveBeenCalledWith(
      'caja-1',
      {
        servicio: 200,
        efectivo: 0,
        tarjeta: 191,
        transferencia: 0,
        prepago: 10,
        iva: 1,
        comision: 5
      },
      contexto
    );
    expect(sendNotificationToAll).not.toHaveBeenCalled();
    expect(tareas).toHaveLength(1);
  });
  it('resuelve y pausa el original antes de bloquear habitacion y consultar caja', async () => {
    await crearServicioEnUnidad(
      {
        ...servicio,
        es_temporal: true,
        servicio_original_id: 'original',
        producto_incluido_presentacion_id: undefined
      },
      'cajero',
      contexto,
      aplazar
    );
    expect(h.eventos).toEqual([
      'original',
      'adicional',
      'pausar-original',
      'cambiar-original',
      ...ordenServicio.filter(nombre => nombre !== 'stock')
    ]);
    expect(registrarComisionesServicio).toHaveBeenCalledWith(
      [expect.objectContaining({ monto: 100 })],
      [expect.objectContaining({ comision: 50 }), expect.objectContaining({ comision: 50 })],
      contexto
    );
  });
  it('rechaza un adicional de otro adicional antes de cualquier otro efecto', async () => {
    vi.mocked(obtenerServicioParaConsumo).mockImplementationOnce(async () => {
      h.eventos.push('original');
      return {
        estado: 2,
        habitacion_id: 'hab',
        cliente_id: null,
        es_temporal: 1,
        servicio_original_id: 'otro'
      };
    });
    await expect(
      crearServicioEnUnidad(
        { ...servicio, es_temporal: true, servicio_original_id: 'original' },
        'cajero',
        contexto,
        aplazar
      )
    ).rejects.toThrow('Crea el adicional desde el servicio principal');
    expect(h.eventos).toEqual(['original']);
    expect(tareas).toEqual([]);
  });
  it('un fallo del producto incluido corta antes de ocupar, asignar y cobrar', async () => {
    const error = new Error('sin stock incluido');
    vi.mocked(consumirStockBar).mockImplementationOnce(async () => {
      h.eventos.push('stock');
      throw error;
    });
    await expect(crearServicioEnUnidad(servicio, 'cajero', contexto, aplazar)).rejects.toBe(error);
    expect(h.eventos).toEqual(ordenServicio.slice(0, ordenServicio.indexOf('stock') + 1));
    expect(tareas).toEqual([]);
  });
});

describe('prioridad de validaciones respecto a las escrituras', () => {
  it('venta sin caja falla antes de validar los pagos mixtos', async () => {
    vi.mocked(obtenerCajaActiva).mockImplementationOnce(async () => {
      h.eventos.push('caja');
      return null;
    });
    await expect(
      registrarVenta({ ...venta, pagos_mixtos: [] }, 'cajero', contexto, aplazar)
    ).rejects.toMatchObject({ code: 'NO_CAJA_ABIERTA' });
    expect(h.eventos).toEqual(['caja']);
  });
  it('servicio sin caja conserva las comprobaciones previas de habitacion y disponibilidad', async () => {
    vi.mocked(obtenerCajaActiva).mockImplementationOnce(async () => {
      h.eventos.push('caja');
      return null;
    });
    await expect(
      crearServicioEnUnidad({ ...servicio, pagos_mixtos: [] }, 'cajero', contexto, aplazar)
    ).rejects.toMatchObject({ code: 'CASH_REGISTER_CLOSED' });
    expect(h.eventos).toEqual(['habitacion-servicio', 'comprobar-libres', 'caja']);
  });
  it('el producto incluido se exige despues de prepago, antes de insertar el servicio', async () => {
    await expect(
      crearServicioEnUnidad(
        { ...servicio, producto_incluido_presentacion_id: undefined },
        'cajero',
        contexto,
        aplazar
      )
    ).rejects.toMatchObject({ code: 'INCLUDED_PRODUCT_REQUIRED' });
    expect(h.eventos).toEqual(ordenServicio.slice(0, ordenServicio.indexOf('cabecera-servicio')));
    expect(tareas).toEqual([]);
  });
  it('anfitrionas desconectadas siguen rechazandose en el mismo punto de la venta', async () => {
    vi.mocked(validarAnfitrionasEnLocal).mockImplementationOnce(async () => {
      h.eventos.push('validar-local');
      return [];
    });
    await expect(registrarVenta(venta, 'cajero', contexto, aplazar)).rejects.toMatchObject({
      code: 'HOSTESS_NOT_LOGGED_IN'
    });
    expect(h.eventos).toEqual(ordenVenta.slice(0, ordenVenta.indexOf('validar-local') + 1));
    expect(tareas).toEqual([]);
  });
});
