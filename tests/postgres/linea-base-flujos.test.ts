import { cobrarCuentaConVenta } from '@/workflows/cobrar-cuenta';
/**
 * Línea base de consultas y tiempos por flujo — Fase 0 del plan de monolito modular.
 *
 * El plan exige, antes de mover un solo archivo, «medir consultas y tiempos de
 * flujos representativos con datos reproducibles». Sin eso, cada fase movería
 * código a ciegas y una regresión de rendimiento se confundiría con un efecto
 * del refactor.
 *
 * Este test mide los flujos de la tabla de pruebas prioritarias del plan y deja
 * dos cosas:
 *
 *  1. `docs/arquitectura/LINEA_BASE_FLUJOS.md`, el número contra el que comparar.
 *  2. Un techo por flujo. Si una migración duplica consultas, el test falla en
 *     vez de dejar que el síntoma aparezca en producción.
 *
 * Las consultas se cuentan con el mismo instrumentado que usa la aplicación
 * (`lib/database/perfilConsultas`), de modo que la cifra es la que vería el
 * endpoint en la cabecera `x-lmr-consultas`, no una métrica paralela.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/modules/comunicaciones/push/servicio', () => ({
  // Devuelven promesa: el repositorio de anticipos encadena `.catch(...)` sobre
  // el resultado, y un `vi.fn()` desnudo devolvería undefined. Los anticipos
  // además notifican al empleado con `sendPushNotification`.
  sendPushByRole: vi.fn(async () => undefined),
  sendPushToUser: vi.fn(async () => undefined),
  sendPushNotification: vi.fn(async () => undefined)
}));
vi.mock('@/modules/auditoria/alertas/servicio', () => ({
  SecurityAlertService: { checkMassAnulation: vi.fn().mockResolvedValue(undefined) }
}));
// `procesarEventoBiometrico` dispara el aviso de audio con `void` (no espera): su
// consulta al equipo volaría después de tomar la instantánea y se mediría en el flujo
// equivocado, o en el siguiente. Mockeado para que el número sea reproducible.
vi.mock('@/modules/asistencia/biometrico/avisosAudio', () => ({
  avisarResultadoEnEquipo: vi.fn().mockResolvedValue(undefined),
  avisarEnrolamientoEnEquipo: vi.fn().mockResolvedValue(undefined)
}));

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import db, { query, withTransaction } from '@/lib/database/db';
import { snapshotDatabase, restoreDatabase } from '@/lib/database/maintenance';
import { instantaneaPerfil, perfilActivo, reiniciarPerfil } from '@/lib/database/perfilConsultas';
import { AccountService } from '@/modules/operacion/cuentas/fachada';
import { consumirStockBar } from '@/modules/inventario';
import { conContextoOperacionExistente } from '@/tests/setup/contexto-operacion';
import {
  listarAnticipos,
  listarHorasExtrasDeUsuario,
  registrarHoraExtra,
  solicitarAnticipoSimple,
  insertarComisionConDetalle
} from '@/modules/personal';
import { getAnticipoBalances } from '@/modules/personal';
import { getAdminWhatsApp } from '@/lib/business/whatsappConfig';
import { getTwilioConfig } from '@/lib/business/twilioConfig';

import { OrderRepository } from '@/modules/operacion/pedidos/repositorio';
import { SaleService } from '@/workflows/ventas';
import { procesarEventoBiometrico } from '@/modules/asistencia/biometrico/processBiometricEvent';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

const RAIZ = resolve(__dirname, '..', '..');

interface Muestra {
  flujo: string;
  n: number;
  ms: number;
  duracionMs: number;
  conexionMs: number;
  conexionesAntes: number;
  conexionesDespues: number;
  distintas: number;
  maxMs: number;
  /** SQL de la consulta más lenta del flujo, para poder investigarla. */
  sqlLenta: string;
  /** Todas las consultas del flujo, de la más lenta a la más rápida. */
  detalle: Array<{ sql: string; n: number; ms: number; maxMs: number }>;
}

/**
 * Techos por flujo: constantes fijas medidas en la línea base, deliberadamente
 * holgadas (+50% y dos consultas de margen) para detectar una degradación
 * estructural —el fallo que importa al partir un flujo en varios módulos— sin
 * caer por un milisegundo.
 *
 * Deben ser literales. La primera versión los calculaba dentro de `medir()` a
 * partir de la propia medición y luego comprobaba contra ese valor: la
 * comparación era `n <= ceil(n * 1.5) + 2`, que es cierta para cualquier n, y
 * el guard no podia fallar nunca. Un techo que se recalcula en cada corrida no
 * es un techo.
 */
const TECHOS: Record<string, number> = Object.freeze({
  'horas extras: listar': 4,
  'horas extras: crear': 5,
  'anticipos: listar': 5,
  'anticipos: crear': 10,
  'cobro de cuenta con venta': 25,
  'inventario: consumo sin existencias': 5,
  'anulación: solicitar': 5,
  'anulación: aprobar parcial': 50,
  'biometría: evento que registra': 11,
  'biometría: evento duplicado': 8
});

let muestras: Muestra[] = [];

beforeAll(() => {
  // Si el instrumentado está apagado la medición no valdría nada: falla aquí y
  // no con un techo de 0 consultas que siempre pasaría.
  expect(perfilActivo(), 'perfilConsultas debe estar activo fuera de producción').toBe(true);
});

afterAll(async () => {
  if (muestras.length) escribirInforme();
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

/**
 * Deja el pool caliente antes de medir.
 *
 * La primera conexión de un proceso contra PostgreSQL cuesta ~157 ms (el
 * handshake TCP y la autenticación), y la siguiente ya 0,0–0,4 ms. Sin este
 * calentamiento esa conexión se le atribuía a la primera consulta del flujo y un
 * `SELECT` sobre una tabla de 0 filas aparecía como la consulta lenta —47, 154 y
 * 50 ms en corridas distintas—. Una línea base tiene que medir el estado
 * estable, que es lo que se compara entre migraciones; el costo de arranque se
 * mide una vez, por proceso.
 */
async function calentarPool(): Promise<void> {
  // Retener los clientes garantiza conexiones distintas: el cobro necesita dos
  // y la anulación llega a cuatro por sus lecturas paralelas. Dos SELECT
  // secuenciales calentaban una sola conexión y ocultaban los otros handshakes.
  const cantidad = Number(process.env.BASELINE_POOL_WARM ?? 4);
  const maximo = Number(process.env.DB_POOL_MAX || 10);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > maximo) {
    throw new Error('BASELINE_POOL_WARM debe estar entre 1 y DB_POOL_MAX (10 por defecto)');
  }
  const clientes = [];
  try {
    for (let i = 0; i < cantidad; i++) clientes.push(await db.pool.connect());
    await Promise.all(clientes.map(cliente => cliente.query('SELECT 1')));
  } finally {
    for (const cliente of clientes) cliente.release();
  }
}

/**
 * Devuelve una caja abierta, creándola si el volcado base no trae ninguna.
 *
 * Registrar una venta sin caja abierta está prohibido por regla de negocio
 * (`NO_CAJA_ABIERTA`), y la anulación parcial sólo revierte saldos si la venta
 * teve caja. Es la misma preparación en los dos flujos; vive aquí una vez.
 */
async function asegurarCajaAbierta(usuarioId: string): Promise<string> {
  const [caja] = await query<{ id_caja: string }[]>(
    'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
  );
  if (caja) return caja.id_caja;

  const idCaja = crypto.randomUUID();
  await query(
    `INSERT INTO cajas (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura,
         monto_cierre, efectivo, tarjeta, transferencia, venta, cargo_tarjeta, iva,
         comision, propina, anticipo, estado)
       VALUES (?, now(), ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)`,
    [idCaja, usuarioId]
  );
  return idCaja;
}

/** Mide un flujo y comprueba su techo. Así todos los flujos quedan guardados. */
async function medir(flujo: string, ejecutar: () => Promise<unknown>): Promise<Muestra> {
  const techo = TECHOS[flujo];
  // Un flujo sin techo no está vigilado: es preferible que se note aquí.
  expect(techo, `falta el techo para el flujo "${flujo}"`).toBeDefined();

  await calentarPool();
  reiniciarPerfil();
  const conexionesAntes = db.pool.totalCount;
  const inicio = performance.now();
  await ejecutar();
  const duracionMs = performance.now() - inicio;
  const resumen = instantaneaPerfil(true);
  const muestra: Muestra = {
    flujo,
    n: resumen.n,
    ms: resumen.ms,
    duracionMs,
    conexionMs: resumen.conexionMs,
    conexionesAntes,
    conexionesDespues: db.pool.totalCount,
    distintas: resumen.distintas,
    maxMs: resumen.detalle[0]?.maxMs ?? 0,
    sqlLenta: resumen.detalle[0]?.sql ?? '',
    detalle: resumen.detalle.map(d => ({ sql: d.sql, n: d.n, ms: d.ms, maxMs: d.maxMs }))
  };
  expect(
    muestra.n,
    `"${flujo}" hizo ${muestra.n} consultas y el techo es ${techo}. ` +
      'Si el cambio es intencionado, sube el techo y explica por qué en FASE0_DECISIONES.md.'
  ).toBeLessThanOrEqual(techo!);
  muestras.push(muestra);
  return muestra;
}

function escribirInforme(): void {
  // Salida opcional para corridas repetidas; conserva las muestras sin redondear
  // la duración del caso de uso. No incluye credenciales ni parámetros SQL.
  if (process.env.BASELINE_OUTPUT) {
    writeFileSync(process.env.BASELINE_OUTPUT, JSON.stringify(muestras, null, 2));
  }
  const filas = muestras
    .map(
      m =>
        `| ${m.flujo} | ${m.n} | ${m.distintas} | ${m.ms} | ${m.maxMs} | ${TECHOS[m.flujo] ?? '—'} |`
    )
    .join('\n');
  const detallePorFlujo = muestras
    .map(
      m =>
        `### ${m.flujo}\n\n` +
        '| Veces | ms (suma) | ms (peor) | SQL |\n|---|---|---|---|\n' +
        m.detalle
          .map(
            d =>
              `| ${d.n}× | ${d.ms} | ${d.maxMs} | \`${d.sql.replace(/\|/g, '\\|').slice(0, 200)}\` |`
          )
          .join('\n')
    )
    .join('\n\n');
  const totalConsultas = muestras.reduce((s, m) => s + m.n, 0);
  const totalMs = muestras.reduce((s, m) => s + m.ms, 0);

  const md = `# Línea base de consultas por flujo

Fecha: primer arranque de la Fase 0
Generado por: \`tests/postgres/linea-base-flujos.test.ts\` (\`pnpm test:postgres\`)

Medido con el mismo instrumentado que usa la aplicación
(\`lib/database/perfilConsultas\`), que es el que responde en la cabecera
\`x-lmr-consultas\`. No es una métrica paralela.

Contra la base \`lasmunecasderamon_test\`, con datos sembrados por el propio test
y restaurados al terminar (\`snapshotDatabase\`/\`restoreDatabase\`), de modo que
la medición es reproducible y no deja residuos.

| Flujo | Consultas | SQL distintos | ms en PostgreSQL | Consulta más lenta | Techo |
|---|---|---|---|---|---|
${filas}
| **Total** | **${totalConsultas}** | | **${totalMs}** | | |

## Consultas por flujo, de la más lenta a la más rápida

Una corrida, con el SQL tal cual lo ve la aplicación. Sirve para investigar sin
tener que instrumentar otra vez:

${detallePorFlujo}

## Cómo se usa

El techo de la última columna es un 50% sobre lo medido, con dos consultas de
margen. Si una fase del plan de módulos hace más consultas de las que hoy, el
test falla. La comparación que importa es siempre **antes y después de una misma
migración**, no contra un número absoluto.
`;
  mkdirSync(resolve(RAIZ, 'docs', 'arquitectura'), { recursive: true });
  writeFileSync(resolve(RAIZ, 'docs', 'arquitectura', 'LINEA_BASE_FLUJOS.md'), md);
}

describe('línea base de consultas por flujo', () => {
  it('horas extras: listar y crear', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const [user] = await query<{ id_usuario: string }[]>(
        'SELECT id_usuario FROM usuarios LIMIT 1'
      );
      const usuarioId = user.id_usuario;

      const lectura = await medir('horas extras: listar', () =>
        listarHorasExtrasDeUsuario(usuarioId)
      );
      expect(lectura.n).toBeGreaterThan(0);

      const escritura = await medir('horas extras: crear', () =>
        registrarHoraExtra({ usuario_id: usuarioId, hora: 2, monto: 1000 })
      );
      expect(escritura.n).toBeGreaterThan(0);
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });

  it('cobro de cuenta: cierra, factura y postula a caja en una transacción', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const [user] = await query<{ id_usuario: string }[]>(
        'SELECT id_usuario FROM usuarios LIMIT 1'
      );
      const [product] = await query<{ id_producto: string }[]>(
        'SELECT id_producto FROM productos LIMIT 1'
      );
      const usuarioId = user.id_usuario;

      await asegurarCajaAbierta(usuarioId);

      const codigo = 'PGLINEABASE';
      const idCuenta = crypto.randomUUID();
      await query(
        `INSERT INTO cuentas (id_cuenta, codigo, cliente_id, total_comision, habitacion_id,
             sub_total, total, metodo_pago, pedido_id, servicio_id, fecha_crea, estado,
             tiempo, tiempo_actual, created_by)
         VALUES (?, ?, NULL, 1500, NULL, 12000, 12000, NULL, NULL, NULL, now(), 1, 0, 0, ?)`,
        [idCuenta, codigo, usuarioId]
      );
      await query(
        `INSERT INTO detalle_cuentas (id_detalle_cuenta, cuenta_id, producto_id, precio,
             cantidad, sub_total, comision, fecha_crea, created_by)
         VALUES (?, ?, ?, 6000, 2, 12000, 1500, now(), ?)`,
        [crypto.randomUUID(), idCuenta, product.id_producto, usuarioId]
      );

      const muestra = await medir('cobro de cuenta con venta', () =>
        cobrarCuentaConVenta(
          idCuenta,
          { montoFinal: 12000, propinaFinal: 0, metodoPago: 'efectivo' },
          usuarioId
        )
      );

      // El cobro tiene que seguir siendo una sola unidad de trabajo: si el plan
      // lo parte en varios módulos, este número es el que avisa (el techo lo
      // comprueba `medir`).
      expect(muestra.n).toBeGreaterThan(0);
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });

  it('inventario: consumo de una presentación', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const [user] = await query<{ id_usuario: string }[]>(
        'SELECT id_usuario FROM usuarios LIMIT 1'
      );
      const presentacionId = crypto.randomUUID();
      const productoId = crypto.randomUUID();
      const sufijo = productoId.slice(0, 8);

      await query(
        `INSERT INTO productos (id_producto, codigo, nombre, precio, comision, descripcion, fecha_crea)
         VALUES (?, ?, ?, 45000, 0, 'Fixture linea base', now())`,
        [productoId, `LB${sufijo}`, 'Whisky linea base']
      );
      await query(
        `INSERT INTO inventario_presentaciones
           (id, producto_id, nombre, precio_venta, comision, ml_botella, fecha_crea)
         VALUES (?, ?, '1000 ml', 45000, 0, NULL, now())`,
        [presentacionId, productoId]
      );
      // Sin unidades: el consumo debe fallar sin tocar el inventario, y esa es la
      // ruta que mide cuántas consultas cuesta el rechazo.
      const muestra = await medir('inventario: consumo sin existencias', async () => {
        await withTransaction(async trx => {
          await conContextoOperacionExistente(trx, contexto =>
            consumirStockBar(
              [{ presentacion_id: presentacionId, cantidad: 1, tipo_venta: 'venta' }],
              { usuarioId: user.id_usuario, fecha: new Date().toISOString().slice(0, 10) },
              contexto
            )
          );
        }).catch(() => undefined);
      });

      expect(muestra.n).toBeGreaterThan(0);
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });

  it('anulación de venta: solicitar y aprobar una devolución parcial', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const [user] = await query<{ id_usuario: string }[]>(
        'SELECT id_usuario FROM usuarios LIMIT 1'
      );
      const [product] = await query<{ id_producto: string }[]>(
        'SELECT id_producto FROM productos LIMIT 1'
      );
      const usuarioId = user.id_usuario;
      await asegurarCajaAbierta(usuarioId);

      // Venta real (pedido + cabecera + detalle) con propina y comisión, que son
      // justamente las dos cosas que la anulación parcial tiene que reponer de forma
      // proporcional. Medir una venta sin ellas dejaría fuera la mitad del trabajo.
      const order = await OrderRepository.create({
        codigo: 'PGLBANUL',
        meseroId: usuarioId,
        subtotal: 12000,
        total: 12000,
        detalles: [
          {
            productoId: product.id_producto,
            precio: 6000,
            cantidad: 2,
            subtotal: 12000,
            generaComision: 0
          }
        ]
      });
      const venta = await SaleService.createSale(
        {
          codigo: 'PGLBANUL',
          pedido_id: order.id,
          total: 12000,
          sub_total: 10000,
          propina: 2000,
          metodo_pago: 'efectivo',
          detalles: [
            { producto_id: product.id_producto, precio: 6000, cantidad: 2, sub_total: 10000 }
          ]
        } as any,
        usuarioId
      );

      await withTransaction(trx =>
        conContextoOperacionExistente(trx, contexto =>
          insertarComisionConDetalle(
            { venta_id: venta.id, usuario_id: usuarioId, monto: 1500 },
            contexto
          )
        )
      );
      const propinaId = crypto.randomUUID();
      await query(
        `INSERT INTO propinas (id_propina, venta_id, propina, estado, fecha_crea)
         VALUES (?, ?, 2000, 1, now())`,
        [propinaId, venta.id]
      );
      await query(
        `INSERT INTO detalle_propinas
           (id_detalle_propina, propina_id, usuario_id, monto, estado, fecha_crea)
         VALUES (?, ?, ?, 2000, 1, now())`,
        [crypto.randomUUID(), propinaId, usuarioId]
      );

      // La solicitud es barata: un INSERT y un UPDATE en la misma transacción. Se
      // mide aparte para que un fallo en la aprobación no se esconda dentro de él.
      const solicitud = await medir('anulación: solicitar', () =>
        SaleService.requestAnulacion(venta.id, 'Producto devuelto', usuarioId, 4000)
      );
      expect(solicitud.n).toBeGreaterThan(0);

      // El token es lo que viaja por WhatsApp; el id es lo que consume el admin.
      const [pendiente] = await query<{ id: string }[]>(
        'SELECT id FROM solicitudes_anulacion_ventas WHERE venta_id = ? LIMIT 1',
        [venta.id]
      );

      const muestra = await medir('anulación: aprobar parcial', () =>
        SaleService.processAnulacion(pendiente.id, usuarioId, 'confirmada')
      );

      // La garantía que el plan le pide a este flujo: stock, caja, comisiones y
      // propinas coherentes. El total pasa de 12.000 a 8.000.
      const [despues] = await query<{ total: number; propina: number }[]>(
        'SELECT total, propina FROM ventas WHERE id_venta = ?',
        [venta.id]
      );
      expect(Number(despues.total)).toBe(8000);
      expect(Number(despues.propina)).toBe(1333);
      expect(muestra.n).toBeGreaterThan(0);
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });

  it('biometría: un evento registra la asistencia y el repetido no la duplica', async () => {
    const snapshot = await snapshotDatabase();
    // `usuarios` y `configuraciones` están fuera del snapshot (excluidas a
    // propósito), así que este test limpia lo suyo a mano.
    const USUARIO = 'lb-biometrico';
    const CODIGO = '7755';
    const EQUIPO = 'lb-biometrico-equipo';
    const VENTANA = ['asistencia_hora_inicio', 'asistencia_hora_fin'];
    const ventanaOriginal = await query<{ id: string; clave: string; valor: string }[]>(
      'SELECT id, clave, valor FROM configuraciones WHERE clave IN (?)',
      [VENTANA]
    );

    try {
      // La ventana de asistencia es configuración del local (21-23 por defecto).
      // Se abre entera para que el resultado no dependa de la hora de la corrida.
      await query('DELETE FROM configuraciones WHERE clave IN (?)', [VENTANA]);
      await query(
        "INSERT INTO configuraciones (id, clave, valor) VALUES ('lb-horario-inicio','asistencia_hora_inicio','0'), ('lb-horario-fin','asistencia_hora_fin','24')"
      );

      await query('DELETE FROM asistencias WHERE usuario_id = ?', [USUARIO]);
      await query('DELETE FROM biometric_events WHERE usuario_id = ?', [USUARIO]);
      await query('DELETE FROM usuarios WHERE id_usuario = ?', [USUARIO]);
      await query(
        `INSERT INTO usuarios
           (id_usuario, run, nick, nombre, apellido, direccion, telefono, estado_civil, afp,
            aporte, sueldo, descuento, password, rol_id, estado, estado_servicio, fecha_crea,
            biometrico_codigo)
         SELECT ?, 'run-lb-bio', ?, 'Linea', 'Base', 'x', '0', 'Soltero', 'n',
            0, 0, 0, 'x', (SELECT id_rol FROM roles LIMIT 1), 1, 1, now(), ?
         WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE biometrico_codigo = ?)`,
        [USUARIO, USUARIO, CODIGO, CODIGO]
      );

      const evento = {
        codigo: CODIGO,
        fechaDispositivo: getNowInBusinessTimezone(),
        metodo: 'huella' as const,
        raw: '{"LineaBase":true}'
      };
      const equipo = { id: EQUIPO, serial: `SERIAL-${EQUIPO}` };

      const primera = await medir('biometría: evento que registra', () =>
        procesarEventoBiometrico(evento, equipo)
      );
      const salida = await query<{ resultado: string }[]>(
        "SELECT resultado FROM biometric_events WHERE usuario_id = ? AND resultado = 'registrado'",
        [USUARIO]
      );
      expect(salida.length).toBe(1);
      expect(primera.n).toBeGreaterThan(0);

      // El mismo código otra vez: la asistencia ya existe y el evento se audita
      // como duplicado. Es la mitad de la garantía del plan sobre kioskos.
      const segunda = await medir('biometría: evento duplicado', () =>
        procesarEventoBiometrico(evento, equipo)
      );
      const filas = await query<{ id_asistencia: string }[]>(
        'SELECT id_asistencia FROM asistencias WHERE usuario_id = ? AND fecha = ?',
        [USUARIO, getNowInBusinessTimezone().substring(0, 10)]
      );
      expect(filas).toHaveLength(1);
      expect(segunda.n).toBeGreaterThan(0);
    } finally {
      await query('DELETE FROM asistencias WHERE usuario_id = ?', [USUARIO]);
      await query('DELETE FROM biometric_events WHERE usuario_id = ?', [USUARIO]);
      await query('DELETE FROM usuarios WHERE id_usuario = ?', [USUARIO]);
      await query('DELETE FROM configuraciones WHERE clave IN (?)', [VENTANA]);
      for (const fila of ventanaOriginal) {
        await query('INSERT INTO configuraciones (id, clave, valor) VALUES (?, ?, ?)', [
          fila.id,
          fila.clave,
          fila.valor
        ]);
      }
      await restoreDatabase(snapshot, 'test-only');
    }
  });

  it('anticipos: listar y solicitar', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const [user] = await query<{ id_usuario: string }[]>(
        'SELECT id_usuario FROM usuarios LIMIT 1'
      );
      const usuarioId = user.id_usuario;

      // La regla de negocio pide monto <= saldo disponible (ingresos - egresos
      // del empleado). Una comisión vigente da saldo sin armar una venta entera;
      // sin solicitudes pendientes (estado 2) la petición pasa el guard de
      // duplicados.
      await query('DELETE FROM anticipos WHERE usuario_id = ? AND estado = 2', [usuarioId]);
      const idComision = crypto.randomUUID();
      await query(
        `INSERT INTO comisiones (id_comision, venta_id, servicio_id, monto, estado, fecha_crea)
         VALUES (?, NULL, NULL, 50000, 1, now())`,
        [idComision]
      );
      await query(
        `INSERT INTO detalle_comisiones
           (id_detalle_comision, comision_id, usuario_id, comision, estado, fecha_crea)
         VALUES (?, ?, ?, 50000, 1, now())`,
        [crypto.randomUUID(), idComision, usuarioId]
      );

      // Calienta las cachés de configuración que el flujo consulta (chequeo de
      // tablas en los balances, admin y Twilio de WhatsApp): la medición refleja
      // el estado estable, no el primer arranque del proceso.
      await getAnticipoBalances(usuarioId);
      await getAdminWhatsApp();
      await getTwilioConfig();

      const lectura = await medir('anticipos: listar', () =>
        listarAnticipos({ usuario_id: usuarioId })
      );
      expect(lectura.n).toBeGreaterThan(0);

      const escritura = await medir('anticipos: crear', () =>
        solicitarAnticipoSimple(usuarioId, 1000, 'Anticipo de línea base')
      );
      expect(escritura.n).toBeGreaterThan(0);
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });
});
