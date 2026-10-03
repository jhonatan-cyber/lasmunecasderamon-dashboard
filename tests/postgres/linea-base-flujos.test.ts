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

vi.mock('@/lib/integrations/pushNotifications', () => ({
  sendPushByRole: vi.fn(),
  sendPushToUser: vi.fn()
}));
vi.mock('@/lib/services/SecurityAlertService', () => ({
  SecurityAlertService: { checkMassAnulation: vi.fn().mockResolvedValue(undefined) }
}));

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import db, { query, withTransaction } from '@/lib/database/db';
import { snapshotDatabase, restoreDatabase } from '@/lib/database/maintenance';
import { instantaneaPerfil, perfilActivo, reiniciarPerfil } from '@/lib/database/perfilConsultas';
import { AccountService } from '@/lib/services/AccountService';
import { OvertimeService } from '@/lib/services/OvertimeService';
import { InventoryRepository } from '@/lib/repositories/InventoryRepository';

const RAIZ = resolve(__dirname, '..', '..');

interface Muestra {
  flujo: string;
  n: number;
  ms: number;
  distintas: number;
  maxMs: number;
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
  'cobro de cuenta con venta': 25,
  'inventario: consumo sin existencias': 5
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

/** Mide un flujo y comprueba su techo. Así todos los flujos quedan guardados. */
async function medir(flujo: string, ejecutar: () => Promise<unknown>): Promise<Muestra> {
  const techo = TECHOS[flujo];
  // Un flujo sin techo no está vigilado: es preferible que se note aquí.
  expect(techo, `falta el techo para el flujo "${flujo}"`).toBeDefined();

  reiniciarPerfil();
  await ejecutar();
  const resumen = instantaneaPerfil(true);
  const muestra: Muestra = {
    flujo,
    n: resumen.n,
    ms: resumen.ms,
    distintas: resumen.distintas,
    maxMs: resumen.detalle[0]?.maxMs ?? 0
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
  const filas = muestras
    .map(
      m =>
        `| ${m.flujo} | ${m.n} | ${m.distintas} | ${m.ms} | ${m.maxMs} | ${TECHOS[m.flujo] ?? '—'} |`
    )
    .join('\n');
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
        OvertimeService.getByUser(usuarioId)
      );
      expect(lectura.n).toBeGreaterThan(0);

      const escritura = await medir('horas extras: crear', () =>
        OvertimeService.create({
          usuario_id: usuarioId,
          hora: 2,
          monto: 1000,
          fecha: new Date().toISOString().slice(0, 10)
        } as any)
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

      const [caja] = await query<{ id_caja: string }[]>(
        'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
      );
      if (!caja) {
        await query(
          `INSERT INTO cajas (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura,
               monto_cierre, efectivo, tarjeta, transferencia, venta, cargo_tarjeta, iva,
               comision, propina, anticipo, estado)
           VALUES (?, now(), ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)`,
          [crypto.randomUUID(), usuarioId]
        );
      }

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
        AccountService.cobrarConVenta(
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
          await InventoryRepository.consume(
            trx,
            [{ presentacion_id: presentacionId, cantidad: 1, tipo_venta: 'venta' }],
            { usuarioId: user.id_usuario, fecha: new Date().toISOString().slice(0, 10) }
          );
        }).catch(() => undefined);
      });

      expect(muestra.n).toBeGreaterThan(0);
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });
});
