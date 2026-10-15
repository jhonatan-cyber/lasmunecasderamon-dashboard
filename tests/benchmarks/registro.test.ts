/** Medición local reproducible. No cambia SQL de la aplicación ni instala índices. */
import { afterAll, expect, it, vi } from 'vitest';
import { AsyncLocalStorage } from 'node:async_hooks';
import { setTimeout as pausa } from 'node:timers/promises';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { cpus } from 'node:os';
import * as timezone from '@/lib/business/timezoneService';
import { getNowInBusinessTimezone as getNowReferencia } from './fixtures/timezone-antes-2026-10-15';
import { logger } from '@/lib/utils/logger';
import { Client, Pool } from 'pg';

vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: vi.fn() }));
vi.mock('@/lib/business/shotAlerts', () => ({ notifyBarShotAlerts: vi.fn() }));
vi.mock('@/modules/comunicaciones/push/servicio', () => ({
  sendPushByRole: vi.fn(),
  sendPushToUser: vi.fn(),
  sendPushNotification: vi.fn()
}));

import db from '@/lib/database/db';
import { prepareQuery } from '@/lib/database/postgres.cjs';
import { env } from '@/lib/utils/env';
import { DashboardCache, invalidateDashboardCache } from '@/lib/cache/dashboardCache';
import { SaleService } from '@/workflows/ventas';
import { crearServicio } from '@/modules/operacion/servicios/creacion';
import { ESTADO_UNIDAD_ACTIVA } from '@/modules/inventario/estados';

interface Consulta {
  sql: string;
  ms: number;
  inicio: number;
  pid: number;
  parametros: unknown[];
  error?: string;
}
interface Espera {
  t: number;
  pid: number;
  tipo: string;
  evento: string;
  bloqueantes: number[];
  sql: string;
  consultaInicio: string;
  esperaObservadaMs: number;
}
interface Muestra {
  caso: string;
  fase: string;
  inicio: number;
  ms: number;
  consultas: Consulta[];
  conexiones: number[];
  cacheMs: number[];
  esperas: Espera[];
  error?: string;
  lote?: number;
  posicion?: number;
  cpu: { zonaHorariaMs: number; zonaHorariaLlamadas: number; logMs: number };
}
interface Fixture {
  usuarios: string[];
  cliente: string;
  habitacion: string;
  productos: string[];
  presentaciones: string[];
}
const contexto = new AsyncLocalStorage<Muestra>();
const muestras: Muestra[] = [];
const pids = new Map<number, Muestra>();
const fixtures = new Set<Fixture>();
const restaurar: Array<() => void> = [];
const caja = crypto.randomUUID();
const observador = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  max: 1,
  options: '-c statement_timeout=3000'
});
const raw = async <T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> => (await db.pool.query(prepareQuery(sql, params))).rows as T[];
let timer: ReturnType<typeof setInterval> | undefined;
let observando = false;
const erroresObservador: string[] = [];
const lotesMedidos: Array<{ caso: string; lote: number; ms: number; retrasoMonitorMaxMs: number }> =
  [];
let retrasoMonitorMaxMs = 0;
const planes: Array<{ caso: string; sql: string; plan: unknown }> = [];
let rol: string;

function instrumentar() {
  const now =
    process.env.REGISTRO_BENCH_TIMEZONE === 'referencia'
      ? getNowReferencia
      : timezone.getNowInBusinessTimezone;
  const tzSpy = vi.spyOn(timezone, 'getNowInBusinessTimezone').mockImplementation((...args) => {
    const inicio = performance.now();
    try {
      return now(...args);
    } finally {
      const m = contexto.getStore();
      if (m) {
        m.cpu.zonaHorariaMs += performance.now() - inicio;
        m.cpu.zonaHorariaLlamadas++;
      }
    }
  });
  restaurar.push(() => tzSpy.mockRestore());
  const debug = logger.debug;
  const logSpy = vi.spyOn(logger, 'debug').mockImplementation((...args) => {
    const inicio = performance.now();
    try {
      return debug(...args);
    } finally {
      const m = contexto.getStore();
      if (m) m.cpu.logMs += performance.now() - inicio;
    }
  });
  restaurar.push(() => logSpy.mockRestore());
  const original = Client.prototype.query;
  const spy = vi.spyOn(Client.prototype, 'query');
  spy.mockImplementation(function (this: Client, ...args: unknown[]) {
    const muestra = contexto.getStore();
    if (!muestra) return Reflect.apply(original, this, args);
    const config = args[0] as { text?: string; values?: unknown[] };
    const sql = typeof args[0] === 'string' ? args[0] : config.text || '';
    const parametros = (Array.isArray(args[1]) ? args[1] : config.values) || [];
    const inicio = performance.now();
    const pid = (this as Client & { processID: number }).processID;
    pids.set(pid, muestra);
    const terminar = (error?: unknown) =>
      muestra.consultas.push({
        sql,
        parametros,
        pid,
        inicio: inicio - muestra.inicio,
        ms: performance.now() - inicio,
        ...(error ? { error: String((error as Error).message) } : {})
      });
    const callback = args.at(-1);
    if (typeof callback === 'function') {
      args[args.length - 1] = function (this: unknown, ...valores: unknown[]) {
        terminar(valores[0]);
        return Reflect.apply(callback, this, valores);
      };
      return Reflect.apply(original, this, args);
    }
    const resultado = Reflect.apply(original, this, args) as Promise<unknown>;
    return resultado.then(
      valor => {
        terminar();
        return valor;
      },
      error => {
        terminar(error);
        throw error;
      }
    );
  } as Client['query']);
  restaurar.push(() => spy.mockRestore());

  const originalConnect = db.pool.connect;
  const connectSpy = vi.spyOn(db.pool, 'connect');
  connectSpy.mockImplementation(function (this: Pool, ...args: unknown[]) {
    const muestra = contexto.getStore();
    if (!muestra) return Reflect.apply(originalConnect, this, args);
    const inicio = performance.now();
    const callback = args[0];
    if (typeof callback === 'function') {
      args[0] = function (this: unknown, ...valores: unknown[]) {
        muestra.conexiones.push(performance.now() - inicio);
        return Reflect.apply(callback, this, valores);
      };
      return Reflect.apply(originalConnect, this, args);
    }
    return (Reflect.apply(originalConnect, this, args) as Promise<unknown>).then(cliente => {
      muestra.conexiones.push(performance.now() - inicio);
      return cliente;
    });
  } as Pool['connect']);
  restaurar.push(() => connectSpy.mockRestore());
  const invalidar = DashboardCache.invalidate.bind(DashboardCache);
  const cacheSpy = vi.spyOn(DashboardCache, 'invalidate').mockImplementation(async () => {
    const inicio = performance.now();
    try {
      await invalidar();
    } finally {
      contexto.getStore()?.cacheMs.push(performance.now() - inicio);
    }
  });
  restaurar.push(() => cacheSpy.mockRestore());
}

async function observar() {
  if (observando || !pids.size) return;
  observando = true;
  try {
    const { rows } = await observador.query<{
      pid: number;
      tipo: string;
      evento: string;
      bloqueantes: number[];
      sql: string;
      consultaInicio: string;
      esperaObservadaMs: number;
    }>(
      `SELECT pid, wait_event_type AS tipo, wait_event AS evento, pg_blocking_pids(a.pid) AS bloqueantes, query AS sql,
        query_start::text AS "consultaInicio",
        COALESCE((SELECT MAX(EXTRACT(EPOCH FROM (clock_timestamp()-l.waitstart))*1000)::float8
          FROM pg_locks l WHERE l.pid=a.pid AND NOT l.granted),0) AS "esperaObservadaMs"
       FROM pg_stat_activity a WHERE a.pid = ANY($1::int[]) AND wait_event_type = 'Lock'`,
      [[...pids.keys()]]
    );
    for (const fila of rows) {
      const muestra = pids.get(fila.pid);
      if (muestra) muestra.esperas.push({ ...fila, t: performance.now() - muestra.inicio });
    }
  } catch (error) {
    erroresObservador.push(String(error));
  } finally {
    observando = false;
  }
}

async function medir(
  caso: string,
  fase: string,
  fn: () => Promise<unknown>,
  lote?: number,
  posicion?: number
) {
  const muestra: Muestra = {
    caso,
    fase,
    inicio: performance.now(),
    ms: 0,
    consultas: [],
    conexiones: [],
    cacheMs: [],
    esperas: [],
    lote,
    posicion,
    cpu: { zonaHorariaMs: 0, zonaHorariaLlamadas: 0, logMs: 0 }
  };
  await contexto.run(muestra, async () => {
    try {
      await fn();
    } catch (error) {
      muestra.error = (error as { code?: string }).code || String(error);
    } finally {
      muestra.ms = performance.now() - muestra.inicio;
    }
  });
  for (const [pid, dueña] of pids) if (dueña === muestra) pids.delete(pid);
  muestras.push(muestra);
  return muestra;
}

async function fixture(items = 1, anfitrionas = 2): Promise<Fixture> {
  const f: Fixture = {
    usuarios: Array.from({ length: anfitrionas }, () => crypto.randomUUID()),
    cliente: crypto.randomUUID(),
    habitacion: crypto.randomUUID(),
    productos: [],
    presentaciones: []
  };
  fixtures.add(f);
  for (const usuario of f.usuarios) {
    await raw(
      `INSERT INTO usuarios (id_usuario, run, nick, nombre, apellido, direccion, telefono, estado_civil,
      afp, aporte, sueldo, password, rol_id, estado, estado_servicio, fecha_crea)
      VALUES (?, ?, ?, 'Benchmark', 'Registro', '', '', '', '', 0, 0, 'BENCH_ONLY', ?, 1, 0, now())`,
      [usuario, usuario, `bench-${usuario}`, rol]
    );
    await raw(
      'INSERT INTO logins (id_login, usuario_id, last_login, estado, en_local) VALUES (?, ?, now(), 1, 1)',
      [crypto.randomUUID(), usuario]
    );
  }
  await raw(
    "INSERT INTO clientes (id_cliente, nombre, apellido, fecha_crea, saldo) VALUES (?, 'Benchmark', 'Registro', now(), 1000000)",
    [f.cliente]
  );
  await raw(
    `INSERT INTO habitaciones (id_habitacion, nombre, precio, tiempo, comision_anfitriona, estado, fecha_crea)
    VALUES (?, ?, 50000, 60, 5000, 1, now())`,
    [f.habitacion, `BENCH-${f.habitacion.slice(0, 8)}`]
  );
  for (let i = 0; i < items; i++) {
    const producto = crypto.randomUUID(),
      presentacion = crypto.randomUUID();
    f.productos.push(producto);
    f.presentaciones.push(presentacion);
    await raw(
      `INSERT INTO productos (id_producto, codigo, nombre, precio, comision, descripcion, fecha_crea)
      VALUES (?, ?, 'Benchmark registro', 10000, 1000, 'Fixture temporal', now())`,
      [producto, producto.slice(0, 20)]
    );
    await raw(
      `INSERT INTO inventario_presentaciones (id, producto_id, nombre, precio_venta, comision, ml_botella, fecha_crea)
      VALUES (?, ?, '750 ml', 10000, 1000, 750, now())`,
      [presentacion, producto]
    );
    for (let j = 0; j < 6; j++) {
      const unidad = crypto.randomUUID();
      await raw(
        `INSERT INTO inventario_unidades (id, producto_id, presentacion_id, codigo, ubicacion, estado, fecha_crea)
        VALUES (?, ?, ?, ?, 'bar', ?, now())`,
        [
          unidad,
          producto,
          presentacion,
          unidad.replaceAll('-', '').slice(0, 20),
          ESTADO_UNIDAD_ACTIVA
        ]
      );
    }
  }
  return f;
}

async function limpiar(f: Fixture) {
  const actor = f.usuarios[0];
  const sqls: Array<[string, unknown[]]> = [
    [
      'DELETE FROM inventario_movimiento_unidades WHERE movimiento_id IN (SELECT id FROM inventario_movimientos WHERE usuario_id = ?)',
      [actor]
    ],
    ['DELETE FROM inventario_movimientos WHERE usuario_id = ?', [actor]],
    ['DELETE FROM detalle_comisiones WHERE usuario_id IN (?)', [f.usuarios]],
    [
      'DELETE FROM comisiones WHERE venta_id IN (SELECT id_venta FROM ventas WHERE created_by = ?) OR servicio_id IN (SELECT id_servicio FROM servicios WHERE created_by = ?)',
      [actor, actor]
    ],
    [
      'DELETE FROM detalle_ventas WHERE venta_id IN (SELECT id_venta FROM ventas WHERE created_by = ?)',
      [actor]
    ],
    [
      'DELETE FROM ventas_usuarios WHERE venta_id IN (SELECT id_venta FROM ventas WHERE created_by = ?)',
      [actor]
    ],
    [
      'DELETE FROM detalle_servicios_clientes WHERE servicio_id IN (SELECT id_servicio FROM servicios WHERE created_by = ?)',
      [actor]
    ],
    [
      'DELETE FROM detalle_servicios WHERE servicio_id IN (SELECT id_servicio FROM servicios WHERE created_by = ?)',
      [actor]
    ],
    ['DELETE FROM clientes_prepago_movimientos WHERE cliente_id = ?', [f.cliente]],
    ['DELETE FROM audit_logs WHERE user_id = ?', [actor]],
    ['DELETE FROM ventas WHERE created_by = ?', [actor]],
    ['DELETE FROM servicios WHERE created_by = ?', [actor]],
    ['DELETE FROM inventario_unidades WHERE producto_id IN (?)', [f.productos]],
    ['DELETE FROM inventario_presentaciones WHERE producto_id IN (?)', [f.productos]],
    ['DELETE FROM productos WHERE id_producto IN (?)', [f.productos]],
    ['DELETE FROM logins WHERE usuario_id IN (?)', [f.usuarios]],
    ['DELETE FROM habitaciones WHERE id_habitacion = ?', [f.habitacion]],
    ['DELETE FROM clientes WHERE id_cliente = ?', [f.cliente]],
    ['DELETE FROM usuarios WHERE id_usuario IN (?)', [f.usuarios]]
  ];
  const cliente = await db.pool.connect();
  try {
    await cliente.query('BEGIN');
    for (const [sql, params] of sqls) await cliente.query(prepareQuery(sql, params));
    await cliente.query('COMMIT');
    fixtures.delete(f);
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

function vender(f: Fixture, mixto = false, compartido?: Fixture) {
  const origen = compartido && !mixto ? compartido : f;
  const total = f.productos.length * 10000;
  return SaleService.createSale(
    {
      total,
      sub_total: total,
      usuarios: f.usuarios,
      ...(mixto
        ? {
            cliente_id: compartido?.cliente || f.cliente,
            metodo_pago: 'mixto' as const,
            pagos_mixtos: [
              { metodo: 'prepago', monto: 5000 },
              { metodo: 'tarjeta', monto: total - 5000 }
            ]
          }
        : {}),
      detalles: f.productos.map((producto_id, i) => ({
        producto_id: origen.productos[i] || producto_id,
        presentacion_id: origen.presentaciones[i],
        cantidad: 1,
        precio: 10000,
        comision: 1000,
        hostesses: f.usuarios
      }))
    },
    f.usuarios[0]
  );
}
function servir(f: Fixture, incluido = true, habitacion = f.habitacion) {
  return crearServicio(
    {
      habitacion_id: habitacion,
      cliente_id: f.cliente,
      precio_habitacion: 50000,
      precio_servicio: 10000,
      iva: 2000,
      sub_total: 68000,
      total: 70000,
      tiempo: 60,
      metodo_pago: 'mixto',
      pagos_mixtos: [
        { metodo: 'prepago', monto: 10000 },
        { metodo: 'tarjeta', monto: 60000 }
      ],
      usuarios: f.usuarios,
      ...(incluido ? { producto_incluido_presentacion_id: f.presentaciones[0] } : {})
    },
    f.usuarios[0]
  );
}

async function explicar(caso: string, muestra: Muestra) {
  const vistas = new Set<string>();
  for (const consulta of muestra.consultas) {
    if (!/^\s*SELECT\b/i.test(consulta.sql) || vistas.has(consulta.sql)) continue;
    vistas.add(consulta.sql);
    const cliente = await db.pool.connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query("SET LOCAL lock_timeout = '1s'");
      const resultado = await cliente.query({
        text: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${consulta.sql}`,
        values: consulta.parametros
      });
      planes.push({ caso, sql: consulta.sql, plan: resultado.rows[0]['QUERY PLAN'] });
    } finally {
      await cliente.query('ROLLBACK');
      cliente.release();
    }
  }
}

const resumen = (valores: number[]) => {
  const orden = [...valores].sort((a, b) => a - b);
  return {
    n: orden.length,
    min: orden[0],
    p50: orden[Math.floor((orden.length - 1) / 2)],
    p95: orden[Math.ceil(orden.length * 0.95) - 1],
    p99: orden[Math.ceil(orden.length * 0.99) - 1],
    max: orden.at(-1),
    media: valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null
  };
};

it('mide consultas, transacciones, escalamiento y bloqueos sin modificar la aplicación', async () => {
  const repeticiones = Number(process.env.REGISTRO_BENCH_RUNS || 20);
  const lotesConcurrentes = Number(process.env.REGISTRO_BENCH_BATCHES || 5);
  expect(Number.isInteger(lotesConcurrentes)).toBe(true);
  expect(lotesConcurrentes).toBeGreaterThanOrEqual(5);
  expect(lotesConcurrentes).toBeLessThanOrEqual(500);
  expect(repeticiones).toBeGreaterThanOrEqual(5);
  expect(repeticiones).toBeLessThanOrEqual(50);
  expect(['actual', 'referencia']).toContain(process.env.REGISTRO_BENCH_TIMEZONE || 'actual');
  const metadata = {
    formateador: process.env.REGISTRO_BENCH_TIMEZONE || 'actual',
    fechaUTC: new Date().toISOString(),
    revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    cambios: execFileSync('git', ['status', '--short'], { encoding: 'utf8' }).trim(),
    node: process.version,
    cpu: cpus()[0]?.model,
    servidor: await raw('SELECT version() AS version'),
    ajustes: await raw(
      "SELECT name, setting FROM pg_settings WHERE name IN ('shared_preload_libraries','log_min_duration_statement','track_io_timing','max_connections','deadlock_timeout','lock_timeout','statement_timeout')"
    ),
    extensiones: await raw('SELECT extname FROM pg_extension'),
    tablas:
      await raw(`SELECT relname, n_live_tup, n_dead_tup, last_analyze, last_autoanalyze FROM pg_stat_user_tables
      WHERE relname IN ('ventas','servicios','usuarios','logins','detalle_servicios','detalle_ventas','clientes','cajas','inventario_unidades','inventario_presentaciones')`),
    indices:
      await raw(`SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = current_schema()
      AND tablename IN ('ventas','servicios','usuarios','logins','detalle_servicios','clientes','cajas','inventario_unidades','inventario_presentaciones')`)
  };
  for (const tabla of metadata.tablas)
    tabla.filasExactas = (await raw(`SELECT COUNT(*)::int AS n FROM ${tabla.relname}`))[0].n;
  rol = String(
    (await raw("SELECT id_rol FROM roles WHERE LOWER(nombre) = 'anfitriona' LIMIT 1"))[0].id_rol
  );
  await raw(
    `INSERT INTO cajas (id_caja, fecha_apertura, monto_apertura, efectivo, tarjeta, transferencia,
    monto_cierre, estado) VALUES (?, (SELECT GREATEST(COALESCE(MAX(fecha_apertura),now()),now()) + interval '1 second' FROM cajas), 0, 0, 0, 0, 0, 1)`,
    [caja]
  );
  const adquisicionesPrecalentamientoMs: number[] = [],
    calientes = [];
  for (let i = 0; i < 5; i++) {
    const inicio = performance.now();
    calientes.push(await db.pool.connect());
    adquisicionesPrecalentamientoMs.push(performance.now() - inicio);
  }
  for (const cliente of calientes) cliente.release();
  await observador.query('SELECT 1');
  instrumentar();
  let ultimoTick = performance.now();
  timer = setInterval(() => {
    const ahora = performance.now();
    retrasoMonitorMaxMs = Math.max(retrasoMonitorMaxMs, ahora - ultimoTick - 5);
    ultimoTick = ahora;
    void observar();
  }, 5);
  const casos = [
    { nombre: 'venta_bar_1', items: 1, run: (f: Fixture) => vender(f) },
    { nombre: 'venta_mixta_1', items: 1, run: (f: Fixture) => vender(f, true) },
    { nombre: 'venta_bar_10', items: 10, run: (f: Fixture) => vender(f) },
    { nombre: 'servicio_VIP', items: 1, run: (f: Fixture) => servir(f) },
    { nombre: 'servicio_sin_producto', items: 1, run: (f: Fixture) => servir(f, false) }
  ];
  for (const caso of casos) {
    for (let i = -2; i < repeticiones; i++) {
      const f = await fixture(caso.items);
      try {
        if (caso.nombre === 'servicio_sin_producto')
          await raw('UPDATE habitaciones SET comision_anfitriona = 0 WHERE id_habitacion = ?', [
            f.habitacion
          ]);
        const m = await medir(caso.nombre, i < 0 ? 'calentamiento' : 'serie', () => caso.run(f));
        expect(m.error, `${caso.nombre}: ${m.error}`).toBeUndefined();
        if (i === 0) await explicar(caso.nombre, m);
      } finally {
        await limpiar(f);
      }
    }
    console.log(`Medido ${caso.nombre}: ${repeticiones} muestras + 2 calentamientos`);
  }
  // Carga natural: cuatro peticiones simultáneas; no se introducen pausas.
  for (const caso of [
    'caja_compartida',
    'inventario_compartido',
    'cliente_compartido',
    'servicios_caja_compartida'
  ]) {
    for (let lote = -2; lote < lotesConcurrentes; lote++) {
      const fs: Fixture[] = [];
      try {
        for (let i = 0; i < 4; i++) fs.push(await fixture());
        retrasoMonitorMaxMs = 0;
        const inicioLote = performance.now();
        const resultados = await Promise.all(
          fs.map((f, posicion) =>
            medir(
              caso,
              lote < 0 ? 'calentamiento' : 'concurrencia',
              () =>
                caso === 'servicios_caja_compartida'
                  ? servir(f)
                  : vender(
                      f,
                      caso === 'cliente_compartido',
                      caso === 'inventario_compartido' || caso === 'cliente_compartido'
                        ? fs[0]
                        : undefined
                    ),
              lote,
              posicion
            )
          )
        );
        if (lote >= 0)
          lotesMedidos.push({
            caso,
            lote,
            ms: performance.now() - inicioLote,
            retrasoMonitorMaxMs
          });
        expect(
          resultados.every(m => !m.error),
          JSON.stringify(resultados.map(m => m.error))
        ).toBe(true);
      } finally {
        for (const f of fs.reverse()) await limpiar(f);
      }
    }
  }
  // Esperas controladas para identificar la sentencia y la propagación de cada bloqueo.
  for (const caso of ['presentacion', 'cliente', 'habitacion', 'anfitriona', 'caja']) {
    const f = await fixture();
    const bloqueador = await db.pool.connect();
    let pendiente: Promise<Muestra> | undefined;
    try {
      const recurso = {
        presentacion: ['inventario_presentaciones', 'id', f.presentaciones[0]],
        cliente: ['clientes', 'id_cliente', f.cliente],
        habitacion: ['habitaciones', 'id_habitacion', f.habitacion],
        anfitriona: ['usuarios', 'id_usuario', f.usuarios[0]],
        caja: ['cajas', 'id_caja', caja]
      }[caso]!;
      await bloqueador.query('BEGIN');
      await bloqueador.query(`SELECT 1 FROM ${recurso[0]} WHERE ${recurso[1]} = $1 FOR UPDATE`, [
        recurso[2]
      ]);
      pendiente = medir(`bloqueo_${caso}`, 'bloqueo_controlado_120ms', () =>
        caso === 'habitacion' || caso === 'anfitriona' ? servir(f) : vender(f, caso === 'cliente')
      );
      await expect
        .poll(
          () => [...pids.values()].some(m => m.caso === `bloqueo_${caso}` && m.esperas.length > 0),
          { timeout: 3000, interval: 5 }
        )
        .toBe(true);
      await pausa(120);
      await bloqueador.query('COMMIT');
      expect((await pendiente).error).toBeUndefined();
    } finally {
      await bloqueador.query('ROLLBACK');
      bloqueador.release();
      if (pendiente) await pendiente;
      await limpiar(f);
    }
  }
  if (timer) clearInterval(timer);
  while (observando) await pausa(1);
  expect(erroresObservador).toEqual([]);
  const grupos = [
    ...new Set(muestras.filter(m => m.fase !== 'calentamiento').map(m => `${m.fase}:${m.caso}`))
  ].map(grupo => {
    const filas = muestras.filter(m => `${m.fase}:${m.caso}` === grupo);
    const sql = new Map<string, { sql: string; n: number; ms: number; maxMs: number }>();
    for (const m of filas)
      for (const c of m.consultas) {
        const clave = c.sql.replace(/\s+/g, ' ').trim();
        const g = sql.get(clave) || { sql: clave, n: 0, ms: 0, maxMs: 0 };
        g.n++;
        g.ms += c.ms;
        g.maxMs = Math.max(g.maxMs, c.ms);
        sql.set(clave, g);
      }
    return {
      grupo,
      latenciaMs: resumen(filas.map(m => m.ms)),
      consultas: resumen(
        filas.map(m => m.consultas.filter(c => !/^(BEGIN|COMMIT|ROLLBACK)$/i.test(c.sql)).length)
      ),
      sqlClienteMs: resumen(filas.map(m => m.consultas.reduce((s, c) => s + c.ms, 0))),
      adquirirConexionMs: resumen(filas.map(m => m.conexiones.reduce((s, v) => s + v, 0))),
      invalidarCacheMs: resumen(filas.map(m => m.cacheMs.reduce((s, v) => s + v, 0))),
      transaccionMs: resumen(
        filas.map(m => {
          const ini = m.consultas.find(c => c.sql === 'BEGIN');
          const fin = m.consultas.find(c => c.sql === 'COMMIT' || c.sql === 'ROLLBACK');
          return ini && fin ? fin.inicio + fin.ms - ini.inicio : 0;
        })
      ),
      ventanasRetencionMs: Object.fromEntries(
        [
          ['cliente', /SELECT saldo FROM clientes.*FOR UPDATE/],
          ['inventario', /FROM inventario_presentaciones.*FOR UPDATE/s],
          ['caja', /^UPDATE cajas SET/],
          ['habitacion', /FROM habitaciones.*FOR UPDATE/s]
        ].map(([recurso, patron]) => [
          recurso,
          resumen(
            filas.flatMap(m => {
              const lock = m.consultas.find(c => (patron as RegExp).test(c.sql));
              const commit = m.consultas.find(c => c.sql === 'COMMIT');
              return lock && commit ? [commit.inicio + commit.ms - lock.inicio - lock.ms] : [];
            })
          )
        ])
      ),
      cpuZonaHorariaMs: resumen(filas.map(m => m.cpu.zonaHorariaMs)),
      cpuLogMs: resumen(filas.map(m => m.cpu.logMs)),
      desdePrimerBloqueoHastaCommitMs: resumen(
        filas.map(m => {
          const lock = m.consultas.find(c => /FOR UPDATE|UPDATE cajas/.test(c.sql));
          const commit = m.consultas.find(c => c.sql === 'COMMIT');
          return lock && commit ? commit.inicio + commit.ms - lock.inicio - lock.ms : 0;
        })
      ),
      esperaObservadaMaxMs: resumen(
        filas.map(m => Math.max(0, ...m.esperas.map(e => e.esperaObservadaMs)))
      ),
      muestrasConBloqueo: filas.filter(m => m.esperas.length).length,
      sentencias: [...sql.values()].sort((a, b) => b.ms - a.ms)
    };
  });
  const archivo = resolve(
    process.env.REGISTRO_BENCH_OUTPUT || 'docs/rendimiento/registro-2026-10-15.json'
  );
  mkdirSync(resolve(archivo, '..'), { recursive: true });
  writeFileSync(
    archivo,
    JSON.stringify(
      {
        metadata,
        adquisicionesPrecalentamientoMs,
        repeticiones,
        lotesConcurrentes,
        lotesMedidos,
        monitorIntervalMs: 5,
        alcance:
          'Casos de uso locales, conexiones calientes, caché real; transportes SSE, push y alertas externos simulados. EXPLAIN SELECT tras commit y antes de limpiar fixtures. No incluye HTTP, autenticación ni renderizado.',
        grupos,
        planes,
        muestras: muestras.map(m => ({
          ...m,
          consultas: m.consultas.map(({ parametros: _params, ...c }) => c)
        }))
      },
      null,
      2
    )
  );
  console.table(
    grupos.map(g => ({
      grupo: g.grupo,
      p50: g.latenciaMs.p50.toFixed(2),
      p95: g.latenciaMs.p95.toFixed(2),
      consultas: g.consultas.p50,
      bloqueos: g.muestrasConBloqueo
    }))
  );
  console.log(`Informe: ${archivo}`);
});

afterAll(async () => {
  if (timer) clearInterval(timer);
  while (observando) await pausa(1);
  for (const fn of restaurar.reverse()) fn();
  try {
    for (const f of [...fixtures]) await limpiar(f);
    await raw('DELETE FROM cajas WHERE id_caja = ?', [caja]);
    await invalidateDashboardCache();
  } finally {
    await observador.end();
    await db.pool.end();
    globalThis.__lasMunecasPgPool = undefined;
  }
});
