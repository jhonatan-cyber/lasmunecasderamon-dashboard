import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: vi.fn() }));
vi.mock('@/modules/comunicaciones/push/servicio', () => ({
  sendPushByRole: vi.fn(),
  sendPushToUser: vi.fn(),
  sendPushNotification: vi.fn()
}));

import db, { query } from '@/lib/database/db';
import { enUnaUnidad, type ContextoOperacion } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { consumirPrepagoCuenta, devolverSaldoEnUnidad } from '@/modules/clientes';
import { cerrarCuentasPrepagoSaldadas, cobrarCuenta } from '@/modules/operacion';

type Operacion = (contexto: ContextoOperacion) => Promise<unknown>;
const falloTardio = new Error('Fallo deliberado despues de escribir');
let clienteId: string;
let cajaId: string | undefined;

beforeEach(async () => {
  clienteId = crypto.randomUUID();
  cajaId = undefined;
  await query(
    'INSERT INTO clientes (id_cliente, nombre, apellido, fecha_crea, saldo) VALUES (?, ?, ?, now(), ?)',
    [clienteId, 'Fixture', 'Atomicidad prepago', 1000]
  );
});

afterEach(async () => {
  // Solo se eliminan las filas propias, despues de esperar todas las transacciones.
  await query('DELETE FROM clientes_prepago_movimientos WHERE cliente_id = ?', [clienteId]);
  await query('DELETE FROM cuentas WHERE cliente_id = ?', [clienteId]);
  await query('DELETE FROM clientes WHERE id_cliente = ?', [clienteId]);
  if (cajaId) await query('DELETE FROM cajas WHERE id_caja = ?', [cajaId]);
});

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

function senal<T>() {
  let resolve!: (valor: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** La segunda operacion debe esperar un bloqueo real, sin depender de sleeps. */
async function solapar(
  primeraOperacion: Operacion,
  segundaOperacion: Operacion,
  revertirPrimera = false
) {
  const primeraLista = senal<number>();
  const segundaLista = senal<number>();
  const liberarPrimera = senal<void>();
  const primera = enUnaUnidad(unidad =>
    unidad.ejecutar(async contexto => {
      const [{ pid }] = await resolverTransaccion(contexto)<{ pid: number }[]>(
        'SELECT pg_backend_pid() AS pid'
      );
      await primeraOperacion(contexto);
      primeraLista.resolve(pid);
      await liberarPrimera.promise;
      if (revertirPrimera) throw falloTardio;
    })
  ).catch(error => {
    primeraLista.reject(error);
    throw error;
  });

  let resultados: Promise<PromiseSettledResult<unknown>[]> = Promise.allSettled([primera]);
  try {
    const pidPrimera = await primeraLista.promise;
    const segunda = enUnaUnidad(unidad =>
      unidad.ejecutar(async contexto => {
        const [{ pid }] = await resolverTransaccion(contexto)<{ pid: number }[]>(
          'SELECT pg_backend_pid() AS pid'
        );
        segundaLista.resolve(pid);
        return segundaOperacion(contexto);
      })
    ).catch(error => {
      segundaLista.reject(error);
      throw error;
    });
    resultados = Promise.allSettled([primera, segunda]);
    const pidSegunda = await segundaLista.promise;
    expect(pidSegunda).not.toBe(pidPrimera);
    await expect
      .poll(
        async () => {
          const { rows } = await db.pool.query<{ bloqueantes: number[] }>(
            'SELECT pg_blocking_pids($1) AS bloqueantes',
            [pidSegunda]
          );
          return rows[0].bloqueantes;
        },
        { timeout: 3000, interval: 20 }
      )
      .toContain(pidPrimera);
    liberarPrimera.resolve();
    return await resultados;
  } finally {
    // Incluso si falla una asercion, se liberan los bloqueos antes del cleanup.
    liberarPrimera.resolve();
    await resultados;
  }
}

async function saldo() {
  const [fila] = await query<{ saldo: number }[]>(
    'SELECT saldo FROM clientes WHERE id_cliente = ?',
    [clienteId]
  );
  return Number(fila.saldo);
}

async function movimientos() {
  return query<{ tipo: string; monto: number; metodo_pago: string; metadatos: string }[]>(
    'SELECT tipo, monto, metodo_pago, metadatos FROM clientes_prepago_movimientos WHERE cliente_id = ?',
    [clienteId]
  );
}

const consumir: Operacion = contexto => consumirPrepagoCuenta(clienteId, 700, contexto);
const devolver: Operacion = contexto =>
  devolverSaldoEnUnidad(
    { cliente_id: clienteId, monto: 700, motivo: 'retiro concurrente' },
    contexto
  );

describe('bloqueo del saldo compartido', () => {
  it.each([
    { nombre: 'dos consumos de cuenta', primera: consumir, segunda: consumir, devoluciones: 0 },
    { nombre: 'dos devoluciones', primera: devolver, segunda: devolver, devoluciones: 1 },
    {
      nombre: 'consumo seguido de devolucion',
      primera: consumir,
      segunda: devolver,
      devoluciones: 0
    },
    {
      nombre: 'devolucion seguida de consumo',
      primera: devolver,
      segunda: consumir,
      devoluciones: 1
    }
  ])('$nombre: la segunda transaccion valida el saldo confirmado', async caso => {
    const resultados = await solapar(caso.primera, caso.segunda);
    expect(resultados[0].status).toBe('fulfilled');
    expect(resultados[1]).toMatchObject({
      status: 'rejected',
      reason: { code: 'SALDO_INSUFICIENTE' }
    });
    expect(await saldo()).toBe(300);
    const filas = await movimientos();
    // La primera operacion se confirma y escribe su movimiento; la segunda se rechaza.
    // El consumo de cuentas ahora deja un movimiento CONSUMO dentro de la transaccion.
    expect(filas).toHaveLength(1);
    const tipoEsperado = caso.devoluciones === 1 ? 'DEVOLUCION' : 'CONSUMO';
    for (const fila of filas) {
      expect(fila.tipo).toBe(tipoEsperado);
      expect(Number(fila.monto)).toBe(700);
      expect(fila.metodo_pago).toBe(tipoEsperado === 'DEVOLUCION' ? 'transferencia' : 'prepago');
    }
  });

  it.each([
    { nombre: 'consumo', operacion: consumir, devoluciones: 0 },
    { nombre: 'devolucion', operacion: devolver, devoluciones: 1 }
  ])('rollback de $nombre libera el saldo para la transaccion en espera', async caso => {
    const resultados = await solapar(caso.operacion, caso.operacion, true);
    expect(resultados[0]).toMatchObject({ status: 'rejected', reason: falloTardio });
    expect(resultados[1].status).toBe('fulfilled');
    expect(await saldo()).toBe(300);
    // La operacion confirmada escribe su propio movimiento (CONSUMO o DEVOLUCION).
    expect(await movimientos()).toHaveLength(1);
  });
});

async function crearCuenta(codigo: string) {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO cuentas (id_cuenta, codigo, cliente_id, total_comision, sub_total, total,
      fecha_crea, estado, tiempo, tiempo_actual)
     VALUES (?, ?, ?, 0, 1000, 1000, now(), 1, 0, 0)`,
    [id, codigo, clienteId]
  );
  return id;
}

async function cuenta(id: string) {
  const [fila] = await query<
    {
      estado: number;
      metodo_pago: string | null;
      cobrado_por: string | null;
      fecha_mod: string | null;
    }[]
  >('SELECT estado, metodo_pago, cobrado_por, fecha_mod FROM cuentas WHERE id_cuenta = ?', [id]);
  return fila;
}

it('un fallo posterior revierte devolucion, movimiento y cierre de cuentas PREP', async () => {
  const id = await crearCuenta(`PREP-${clienteId.slice(0, 8)}`);
  const antes = await cuenta(id);
  await expect(
    enUnaUnidad(unidad =>
      unidad.ejecutar(async contexto => {
        const saldado = await devolverSaldoEnUnidad(
          { cliente_id: clienteId, monto: 1000 },
          contexto
        );
        expect(saldado).toBe(true);
        if (saldado) await cerrarCuentasPrepagoSaldadas(clienteId, contexto);
        const trx = resolverTransaccion(contexto);
        const [cerrada] = await trx<{ estado: number }[]>(
          'SELECT estado FROM cuentas WHERE id_cuenta = ?',
          [id]
        );
        expect(Number(cerrada.estado)).toBe(0);
        const [movimiento] = await trx<{ monto: number }[]>(
          'SELECT monto FROM clientes_prepago_movimientos WHERE cliente_id = ?',
          [clienteId]
        );
        expect(Number(movimiento.monto)).toBe(1000);
        throw falloTardio;
      })
    )
  ).rejects.toBe(falloTardio);
  expect(await saldo()).toBe(1000);
  expect(await movimientos()).toEqual([]);
  expect(await cuenta(id)).toEqual(antes);
});

it('un fallo posterior al cobro revierte saldo, estado de cuenta y caja', async () => {
  const [usuario] = await query<{ id_usuario: string }[]>(
    'SELECT id_usuario FROM usuarios LIMIT 1'
  );
  cajaId = crypto.randomUUID();
  await query(
    `INSERT INTO cajas (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura,
      monto_cierre, efectivo, tarjeta, transferencia, venta, servicio, cargo_tarjeta, iva, comision, propina, anticipo, estado)
     VALUES (?, (SELECT GREATEST(COALESCE(MAX(fecha_apertura), now()), now()) + interval '1 second' FROM cajas),
      ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)`,
    [cajaId, usuario.id_usuario]
  );
  const id = await crearCuenta(`PG-COBRO-${clienteId.slice(0, 8)}`);
  const antes = await cuenta(id);
  const estadoCaja = async () =>
    (
      await query('SELECT prepago, venta, propina, efectivo FROM cajas WHERE id_caja = ?', [cajaId])
    )[0];
  const cajaAntes = await estadoCaja();
  const efectos: Array<() => void | Promise<void>> = [];
  await expect(
    enUnaUnidad(unidad =>
      unidad.ejecutar(async contexto => {
        await cobrarCuenta(
          id,
          { tipoPago: 'prepago', montoFinal: 700, propinaFinal: 0 },
          usuario.id_usuario,
          contexto,
          tarea => {
            efectos.push(tarea);
          }
        );
        const trx = resolverTransaccion(contexto);
        const [cliente] = await trx<{ saldo: number }[]>(
          'SELECT saldo FROM clientes WHERE id_cliente = ?',
          [clienteId]
        );
        expect(Number(cliente.saldo)).toBe(300);
        const [caja] = await trx<{ prepago: number; venta: number }[]>(
          'SELECT prepago, venta FROM cajas WHERE id_caja = ?',
          [cajaId]
        );
        expect(Number(caja.prepago)).toBe(Number(cajaAntes.prepago) + 700);
        expect(Number(caja.venta)).toBe(Number(cajaAntes.venta) + 700);
        throw falloTardio;
      })
    )
  ).rejects.toBe(falloTardio);
  expect(await saldo()).toBe(1000);
  expect(await cuenta(id)).toEqual(antes);
  expect(await estadoCaja()).toEqual(cajaAntes);
  expect(await movimientos()).toEqual([]);
  expect(efectos.length).toBeGreaterThan(0);
});
