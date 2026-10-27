import { afterAll, expect, it, vi } from 'vitest';

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Se espía sin romper el camino real: el test necesita el nombre del archivo que
// se creó para comprobar que el `catch` lo borró.
const guardarBaucher = vi.hoisted(() => vi.fn());

vi.mock('@/lib/utils/image-utils', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/utils/image-utils')>();
  guardarBaucher.mockImplementation((...args: Parameters<typeof original.guardarFotoBaucher>) =>
    original.guardarFotoBaucher(...args)
  );
  return { ...original, guardarFotoBaucher: guardarBaucher };
});

import db, { query } from '@/lib/database/db';
import { restoreDatabase, snapshotDatabase } from '@/lib/database/maintenance';
import {
  anularEntrada,
  entregarEntrada,
  listarPendientes,
  postearPendientesDeCaja,
  registrarEntrada
} from '@/modules/entradas';
import type { PlanVentaEntrada, RegistradorVenta } from '@/modules/entradas';
import { ESTADO_UNIDAD_ACTIVA, ESTADO_UNIDAD_VENDIDA } from '@/modules/inventario/estados';
import { SaleService } from '@/workflows/ventas';

/**
 * Flujo real de entradas contra PostgreSQL: el garzón cobra en la puerta y el
 * cliente decide en la barra si recibe la cortesía o paga un adicional.
 *
 * El invariante que estas pruebas cuidan es que cada peso entra a la caja una
 * sola vez: la puerta no postea nada, la cortesía postea el monto de la entrada
 * y el adicional deja que `SaleService` registre la venta (el módulo nunca
 * postea dinero de venta por su cuenta).
 *
 * La caja no tiene tabla de movimientos: los saldos son columnas de `cajas`
 * (`efectivo`, `tarjeta`, `transferencia`, `venta`), así que "no posteó" se
 * comprueba comparando esas columnas antes y después.
 */

const FECHA = '2026-01-20';
const HORA = '21:30';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

interface Saldos {
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  venta: number;
}

async function primerUsuarioActivo(): Promise<string> {
  const [usuario] = await query<{ id_usuario: string }[]>(
    'SELECT id_usuario FROM usuarios WHERE estado = 1 ORDER BY fecha_crea ASC LIMIT 1'
  );
  if (!usuario) throw new Error('La base de pruebas no tiene usuarios activos');
  return usuario.id_usuario;
}

/** Caja propia del caso: el barrido del cierre filtra por `caja_id`. */
async function cajaAbierta(): Promise<string> {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO cajas
       (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura, monto_cierre,
        efectivo, tarjeta, transferencia, venta, cargo_tarjeta, iva, comision,
        propina, anticipo, estado)
     VALUES (?, now(), ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)`,
    [id, await primerUsuarioActivo()]
  );
  return id;
}

async function saldosCaja(cajaId: string): Promise<Saldos> {
  const [fila] = await query<Saldos[]>(
    'SELECT efectivo, tarjeta, transferencia, venta FROM cajas WHERE id_caja = ?',
    [cajaId]
  );
  return {
    efectivo: Number(fila.efectivo),
    tarjeta: Number(fila.tarjeta),
    transferencia: Number(fila.transferencia),
    venta: Number(fila.venta)
  };
}

/** Configura una clave numérica del tab Bar y comisiones (crea la fila si falta). */
async function fijarConfiguracion(clave: string, valor: number): Promise<void> {
  const [existente] = await query<{ id: string }[]>(
    'SELECT id FROM configuraciones WHERE clave = ? LIMIT 1',
    [clave]
  );
  if (existente) {
    await query('UPDATE configuraciones SET valor = ? WHERE clave = ?', [String(valor), clave]);
    return;
  }
  await query(
    'INSERT INTO configuraciones (id, clave, valor, categoria, tipo, fecha_crea) VALUES (?, ?, ?, ?, ?, now())',
    [crypto.randomUUID(), clave, String(valor), 'comisiones', 'number']
  );
}

interface Bebida {
  productoId: string;
  presentacionId: string;
  unidadId: string;
}

/** Bebida con una unidad en el bar, al precio de lista indicado. */
async function crearBebida(nombre: string, precio: number): Promise<Bebida> {
  const productoId = crypto.randomUUID();
  const presentacionId = crypto.randomUUID();
  const unidadId = crypto.randomUUID();
  const codigo = `ENT${productoId.slice(0, 8)}`;
  const opcion = { tipo: 'botella', precio, comision: 0 };

  await query(
    `INSERT INTO productos
       (id_producto, codigo, nombre, categoria_id, precio, comision, fecha_crea)
     VALUES (?, ?, ?, NULL, ?, 0, now())`,
    [productoId, codigo, nombre, precio]
  );
  await query(
    `INSERT INTO inventario_presentaciones
       (id, producto_id, nombre, precio_venta, comision, ml_botella, opciones_venta)
     VALUES (?, ?, '750 ml', ?, 0, 750, ?::jsonb)`,
    [presentacionId, productoId, precio, JSON.stringify([opcion])]
  );
  await query(
    `INSERT INTO inventario_unidades
       (id, producto_id, presentacion_id, codigo, ubicacion, estado, fecha_crea)
     VALUES (?, ?, ?, ?, 'bar', ?, now())`,
    [unidadId, productoId, presentacionId, `${codigo}U`, ESTADO_UNIDAD_ACTIVA]
  );

  return { productoId, presentacionId, unidadId };
}

/** Bebida de bar cuya opción botella exige acompañamiento. */
async function crearBebidaConAcompanamiento(
  nombre: string,
  precio: number,
  unidades: number
): Promise<Bebida> {
  const bebida = await crearBebida(nombre, precio);
  await query(
    `UPDATE inventario_presentaciones
        SET opciones_venta = ?::jsonb
      WHERE id = ?`,
    [
      JSON.stringify([{ tipo: 'botella', precio, comision: 0, acompanamiento: { unidades } }]),
      bebida.presentacionId
    ]
  );
  return bebida;
}

/** Acompañamiento: solo la categoría protegida de analcohólicas vale como tal. */
async function crearAcompanamiento(
  nombre: string,
  unidades: number
): Promise<{ productoId: string; presentacionId: string; unidadIds: string[] }> {
  const [categoria] = await query<{ id_categoria: string }[]>(
    "SELECT id_categoria FROM categorias WHERE system_key = 'bebidas_analcoholicas' LIMIT 1"
  );
  if (!categoria) throw new Error('La base de pruebas no tiene la categoría de analcohólicas');

  const productoId = crypto.randomUUID();
  const presentacionId = crypto.randomUUID();
  const codigo = `ANA${productoId.slice(0, 8)}`;

  await query(
    `INSERT INTO productos
       (id_producto, codigo, nombre, categoria_id, precio, comision, fecha_crea)
     VALUES (?, ?, ?, ?, 0, 0, now())`,
    [productoId, codigo, nombre, categoria.id_categoria]
  );
  await query(
    `INSERT INTO inventario_presentaciones
       (id, producto_id, nombre, precio_venta, comision, ml_botella)
     VALUES (?, ?, '355 ml', 0, 0, 355)`,
    [presentacionId, productoId]
  );

  const unidadIds: string[] = [];
  for (let i = 0; i < unidades; i++) {
    const unidadId = crypto.randomUUID();
    unidadIds.push(unidadId);
    await query(
      `INSERT INTO inventario_unidades
         (id, producto_id, presentacion_id, codigo, ubicacion, estado, fecha_crea)
       VALUES (?, ?, ?, ?, 'bar', ?, now())`,
      [unidadId, productoId, presentacionId, `${codigo}U${i}`, ESTADO_UNIDAD_ACTIVA]
    );
  }

  return { productoId, presentacionId, unidadIds };
}

async function filaEntrada(id: string) {
  const [fila] = await query<
    {
      cortesia_estado: string;
      monto_entrada: number;
      monto_bebida_adicional: number;
      cover_presentacion_id: string | null;
      cortesia_entregada_por: string | null;
      cortesia_entregada_at: string | null;
      venta_id: string | null;
    }[]
  >(
    `SELECT e.cortesia_estado, e.monto_entrada, e.monto_bebida_adicional,
            e.cover_presentacion_id, e.cortesia_entregada_por, e.cortesia_entregada_at,
            v.id_venta AS venta_id
       FROM entradas_clientes e
       LEFT JOIN ventas v ON v.entrada_id = e.id
      WHERE e.id = ?`,
    [id]
  );
  return fila;
}

/** Fotos de baucher guardadas en public/img/tickets, ordenadas. */
const DIRECTORIO_BAUCHERS = path.join(process.cwd(), 'public', 'img', 'tickets');

async function leerBauchersTickets(): Promise<string[]> {
  return (await fs.readdir(DIRECTORIO_BAUCHERS).catch(() => [] as string[])).sort();
}

/** PNG real y mínimo: `guardarFotoBaucher` lo pasa por sharp. */
async function fotoBaucher(): Promise<string> {
  const png = await sharp({
    create: { width: 8, height: 8, channels: 3, background: { r: 180, g: 40, b: 40 } }
  })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

it('registra la entrada en la puerta sin postear caja, stock ni venta', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cajaId = await cajaAbierta();
    const usuarioId = await primerUsuarioActivo();
    await fijarConfiguracion('costo_entrada', 10000);
    const bebida = await crearBebida('Bebida intacta', 8000);
    const saldosAntes = await saldosCaja(cajaId);

    const resultado = await registrarEntrada({
      clienteNombre: 'Grupo de prueba',
      cantidadEntradas: 2,
      metodoPago: 'efectivo',
      fecha: FECHA,
      hora: HORA,
      registradoPor: usuarioId
    });

    expect(resultado.ids).toHaveLength(2);
    expect(resultado.monto_entrada).toBe(10000);
    expect(resultado.monto_total).toBe(20000);
    expect(resultado.caja_id).toBe(cajaId);

    const filas = await query<
      { id: string; cortesia_estado: string; monto_entrada: number; caja_id: string }[]
    >(
      `SELECT id, cortesia_estado, monto_entrada, caja_id
         FROM entradas_clientes WHERE grupo_registro_id = ? ORDER BY id`,
      [resultado.grupo_registro_id]
    );
    expect(filas).toHaveLength(2);
    for (const fila of filas) {
      expect(fila.cortesia_estado).toBe('pendiente');
      expect(Number(fila.monto_entrada)).toBe(10000);
      expect(fila.caja_id).toBe(cajaId);
    }

    // La puerta no toca nada más: mismo saldo, sin venta asociada y el bar intacto.
    expect(await saldosCaja(cajaId)).toEqual(saldosAntes);
    const [ventas] = await query<{ total: number }[]>(
      'SELECT COUNT(*)::int AS total FROM ventas WHERE entrada_id IN (?)',
      [resultado.ids]
    );
    expect(ventas.total).toBe(0);
    const [movimientos] = await query<{ total: number }[]>(
      'SELECT COUNT(*)::int AS total FROM inventario_movimientos WHERE presentacion_id = ?',
      [bebida.presentacionId]
    );
    expect(movimientos.total).toBe(0);

    // La cola del bar ve las dos filas del grupo.
    const pendientes = await listarPendientes(FECHA);
    expect(pendientes.filter(pendiente => resultado.ids.includes(pendiente.id))).toHaveLength(2);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('si el registro falla, la foto del baucher no queda huérfana en disco', async () => {
  const snapshot = await snapshotDatabase();
  const antes = await leerBauchersTickets();
  try {
    const usuarioId = await primerUsuarioActivo();
    await fijarConfiguracion('costo_entrada', 10000);
    // Sin caja abierta el alta falla dentro de la transacción, ya con la foto
    // escrita en disco: se guarda antes del INSERT porque las filas guardan su nombre.
    await query('UPDATE cajas SET estado = 0 WHERE estado = 1');
    guardarBaucher.mockClear();

    await expect(
      registrarEntrada({
        cantidadEntradas: 1,
        metodoPago: 'transferencia',
        baucherFoto: await fotoBaucher(),
        fecha: FECHA,
        hora: HORA,
        registradoPor: usuarioId
      })
    ).rejects.toThrow(/caja/i);

    // La foto llegó a escribirse…
    const nombre = String(await guardarBaucher.mock.results[0].value);
    expect(nombre).toMatch(/^ticket_\d+\.webp$/);
    await expect(fs.stat(path.join(DIRECTORIO_BAUCHERS, nombre))).rejects.toMatchObject({
      code: 'ENOENT'
    });
    // …y nada nuevo sobrevivió en public/img/tickets: lo borró el `catch`.
    expect(await leerBauchersTickets()).toEqual(antes);
  } finally {
    for (const archivo of await leerBauchersTickets())
      if (!antes.includes(archivo))
        await fs.rm(path.join(DIRECTORIO_BAUCHERS, archivo), { force: true });
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('rechaza un total que no coincide con costo_entrada', async () => {
  const snapshot = await snapshotDatabase();
  try {
    await cajaAbierta();
    const usuarioId = await primerUsuarioActivo();
    await fijarConfiguracion('costo_entrada', 10000);

    await expect(
      registrarEntrada({
        cantidadEntradas: 2,
        montoEntrada: 8000,
        metodoPago: 'efectivo',
        fecha: FECHA,
        hora: HORA,
        registradoPor: usuarioId
      })
    ).rejects.toThrow(
      'El precio de la entrada no coincide: son 10000 por persona (20000 en total)'
    );

    const filas = await query<{ id: string }[]>(
      'SELECT id FROM entradas_clientes WHERE fecha = ?',
      [FECHA]
    );
    expect(filas).toHaveLength(0);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('entrega la cortesía: consume el bar, postea la entrada y cierra la fila', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cajaId = await cajaAbierta();
    const usuarioId = await primerUsuarioActivo();
    await fijarConfiguracion('costo_entrada', 10000);
    await fijarConfiguracion('monto_base_trago_cortesia_cliente', 10000);
    const bebida = await crearBebida('Bebida de cortesía', 8000);

    const entrada = await registrarEntrada({
      cantidadEntradas: 1,
      metodoPago: 'efectivo',
      fecha: FECHA,
      hora: HORA,
      registradoPor: usuarioId
    });
    const saldosAntes = await saldosCaja(cajaId);

    const entrega = await entregarEntrada({
      entradaId: entrada.id,
      presentacionId: bebida.presentacionId,
      usuarioId
    });

    expect(entrega).toMatchObject({
      tipo: 'cortesia',
      precio: 8000,
      montoEntrada: 10000,
      montoCobrarBarra: 0,
      ventaId: null,
      cajaId
    });

    // El stock salió como cortesía (precio 0) y el dinero se posteó a la caja
    // como entrada: efectivo sube, `venta` no.
    const [movimiento] = await query<{ tipo: string; precio_venta: number }[]>(
      'SELECT tipo, precio_venta FROM inventario_movimientos WHERE presentacion_id = ?',
      [bebida.presentacionId]
    );
    expect(movimiento).toMatchObject({ tipo: 'cortesia', precio_venta: 0 });

    const saldosDespues = await saldosCaja(cajaId);
    expect(saldosDespues.efectivo - saldosAntes.efectivo).toBe(10000);
    expect(saldosDespues.venta).toBe(saldosAntes.venta);

    expect(await filaEntrada(entrada.id)).toMatchObject({
      cortesia_estado: 'entregada',
      monto_bebida_adicional: 0,
      cover_presentacion_id: bebida.presentacionId,
      cortesia_entregada_por: usuarioId,
      venta_id: null
    });

    const detalles = await query<{ cantidad: number }[]>(
      'SELECT cantidad FROM entradas_clientes_productos WHERE entrada_id = ?',
      [entrada.id]
    );
    expect(detalles).toHaveLength(1);

    // La fila ya cerrada no se entrega dos veces.
    await expect(
      entregarEntrada({ entradaId: entrada.id, presentacionId: bebida.presentacionId, usuarioId })
    ).rejects.toThrow('Esta entrada ya fue entregada o anulada');
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('usa el mayor entre el tope de cortesía y lo pagado en la puerta', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cajaId = await cajaAbierta();
    const usuarioId = await primerUsuarioActivo();
    await fijarConfiguracion('costo_entrada', 10000);
    // Tope configurado por debajo de la entrada: la bebida vale más que el tope
    // pero menos que lo ya pagado, así que sigue siendo cortesía.
    await fijarConfiguracion('monto_base_trago_cortesia_cliente', 3000);
    const bebida = await crearBebida('Bebida intermedia', 9000);

    const entrada = await registrarEntrada({
      cantidadEntradas: 1,
      metodoPago: 'efectivo',
      fecha: FECHA,
      hora: HORA,
      registradoPor: usuarioId
    });
    const saldosAntes = await saldosCaja(cajaId);

    const entrega = await entregarEntrada({
      entradaId: entrada.id,
      presentacionId: bebida.presentacionId,
      usuarioId
    });

    expect(entrega.tipo).toBe('cortesia');
    expect(entrega.montoCobrarBarra).toBe(0);
    expect((await saldosCaja(cajaId)).efectivo - saldosAntes.efectivo).toBe(10000);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('entrega con adicional: arma la venta por el precio de lista y no postea el dinero', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cajaId = await cajaAbierta();
    const usuarioId = await primerUsuarioActivo();
    await fijarConfiguracion('costo_entrada', 10000);
    await fijarConfiguracion('monto_base_trago_cortesia_cliente', 10000);
    const bebida = await crearBebida('Bebida premium', 25000);

    const entrada = await registrarEntrada({
      cantidadEntradas: 1,
      metodoPago: 'tarjeta',
      fecha: FECHA,
      hora: HORA,
      registradoPor: usuarioId
    });
    const saldosAntes = await saldosCaja(cajaId);

    const planes: PlanVentaEntrada[] = [];
    const registrarVenta: RegistradorVenta = async plan => {
      planes.push(plan);
      return { ventaId: 'venta-de-prueba' };
    };

    const entrega = await entregarEntrada(
      { entradaId: entrada.id, presentacionId: bebida.presentacionId, usuarioId },
      registrarVenta
    );

    expect(entrega).toMatchObject({
      tipo: 'upgrade',
      precio: 25000,
      montoEntrada: 10000,
      montoCobrarBarra: 15000,
      ventaId: 'venta-de-prueba'
    });

    // La venta lleva el precio de lista completo y hereda el método de pago de la
    // puerta; así lo posteado (entradas + ventas) iguala lo cobrado.
    expect(planes).toHaveLength(1);
    expect(planes[0]).toMatchObject({
      totalVenta: 25000,
      metodoPago: 'tarjeta',
      usuarioId,
      entradaId: entrada.id
    });
    expect(planes[0].detalles[0]).toMatchObject({
      presentacion_id: bebida.presentacionId,
      precio: 25000,
      cantidad: 1,
      sub_total: 25000
    });

    // El módulo no postea dinero de la venta: eso es de `SaleService`.
    expect(await saldosCaja(cajaId)).toEqual(saldosAntes);

    expect(await filaEntrada(entrada.id)).toMatchObject({
      cortesia_estado: 'entregada',
      monto_bebida_adicional: 15000,
      cover_presentacion_id: bebida.presentacionId
    });
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('registra la venta del adicional con SaleService y deja la caja cuadrada', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cajaId = await cajaAbierta();
    const usuarioId = await primerUsuarioActivo();
    await fijarConfiguracion('costo_entrada', 10000);
    await fijarConfiguracion('monto_base_trago_cortesia_cliente', 10000);
    const bebida = await crearBebida('Bebida premium con venta', 25000);

    const entrada = await registrarEntrada({
      cantidadEntradas: 1,
      metodoPago: 'tarjeta',
      fecha: FECHA,
      hora: HORA,
      registradoPor: usuarioId
    });
    const saldosAntes = await saldosCaja(cajaId);

    // Mismo adaptador que `app/api/tickets/[id]/entregar/route.ts`: la venta se
    // registra con `SaleService` sobre la misma transacción de la entrega.
    const entrega = await entregarEntrada(
      { entradaId: entrada.id, presentacionId: bebida.presentacionId, usuarioId },
      async (plan, contexto, asignarTarea) => {
        const venta = await SaleService.createSale(
          {
            total: plan.totalVenta,
            sub_total: plan.totalVenta,
            total_comision: 0,
            metodo_pago: plan.metodoPago,
            propina: 0,
            tiempo: 0,
            usuarios: [],
            detalles: plan.detalles as never
          },
          plan.usuarioId,
          { contexto, entradaId: plan.entradaId, onAfterCommit: asignarTarea }
        );
        const ventaId = venta?.id ?? venta?.id_venta ?? null;
        return { ventaId: ventaId ? String(ventaId) : null };
      }
    );

    expect(entrega).toMatchObject({
      tipo: 'upgrade',
      precio: 25000,
      montoEntrada: 10000,
      montoCobrarBarra: 15000
    });
    expect(entrega.ventaId).toBeTruthy();

    const [venta] = await query<
      {
        id_venta: string;
        total: number;
        entrada_id: string;
        metodo_pago: string;
        caja_id: string;
        origen: string;
      }[]
    >(
      'SELECT id_venta, total, entrada_id, metodo_pago, caja_id, origen FROM ventas WHERE id_venta = ?',
      [entrega.ventaId]
    );
    expect(venta).toBeTruthy();
    expect(Number(venta.total)).toBe(25000);
    expect(venta.entrada_id).toBe(entrada.id);
    // La venta nació de la entrada: queda etiquetada así, no como venta de barra.
    expect(venta.origen).toBe('entrada');
    expect(venta.metodo_pago).toBe('tarjeta');
    expect(venta.caja_id).toBe(cajaId);

    // La fila de la entrada queda ligada a la venta que la cerró.
    const fila = await filaEntrada(entrada.id);
    expect(fila.venta_id).toBe(entrega.ventaId);
    expect(Number(fila.monto_bebida_adicional)).toBe(15000);

    // Cada peso entró una sola vez: la caja cobra el precio de lista completo
    // (10.000 de la puerta + 15.000 de la barra) y la venta queda facturada.
    const saldosDespues = await saldosCaja(cajaId);
    expect(saldosDespues.tarjeta - saldosAntes.tarjeta).toBe(25000);
    expect(saldosDespues.venta - saldosAntes.venta).toBe(25000);
    expect(saldosDespues.efectivo).toBe(saldosAntes.efectivo);
    expect(saldosDespues.transferencia).toBe(saldosAntes.transferencia);

    // El stock del bar salió con la venta.
    const [unidad] = await query<{ estado: string }[]>(
      'SELECT estado FROM inventario_unidades WHERE id = ?',
      [bebida.unidadId]
    );
    expect(unidad.estado).toBe(ESTADO_UNIDAD_VENDIDA);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('barre las pendientes del cierre de caja y las deja anuladas sin repetir el posteo', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cajaId = await cajaAbierta();
    const usuarioId = await primerUsuarioActivo();
    await fijarConfiguracion('costo_entrada', 10000);

    const entrada = await registrarEntrada({
      cantidadEntradas: 2,
      metodoPago: 'tarjeta',
      fecha: FECHA,
      hora: HORA,
      registradoPor: usuarioId
    });
    const saldosAntes = await saldosCaja(cajaId);

    const barrido = await postearPendientesDeCaja({ cajaId, usuarioId });
    expect(barrido).toEqual({ entradas: 2, total: 20000 });

    const saldosDespues = await saldosCaja(cajaId);
    expect(saldosDespues.tarjeta - saldosAntes.tarjeta).toBe(20000);
    expect(saldosDespues.venta).toBe(saldosAntes.venta);

    for (const id of entrada.ids) {
      expect(await filaEntrada(id)).toMatchObject({
        cortesia_estado: 'anulada',
        cortesia_entregada_por: usuarioId
      });
    }

    // El barrido es idempotente: ya no queda nada pendiente en esa caja.
    expect(await postearPendientesDeCaja({ cajaId, usuarioId })).toEqual({
      entradas: 0,
      total: 0
    });
    expect(await saldosCaja(cajaId)).toEqual(saldosDespues);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('anula a mano una entrada que nunca se sirvió y postea su monto', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cajaId = await cajaAbierta();
    const usuarioId = await primerUsuarioActivo();
    await fijarConfiguracion('costo_entrada', 10000);
    const bebida = await crearBebida('Bebida que no se sirvió', 9000);

    const entrada = await registrarEntrada({
      cantidadEntradas: 1,
      metodoPago: 'transferencia',
      fecha: FECHA,
      hora: HORA,
      registradoPor: usuarioId
    });
    const saldosAntes = await saldosCaja(cajaId);

    const anulacion = await anularEntrada({ entradaId: entrada.id, usuarioId });
    expect(anulacion.monto).toBe(10000);
    expect((await saldosCaja(cajaId)).transferencia - saldosAntes.transferencia).toBe(10000);
    expect((await saldosCaja(cajaId)).venta).toBe(saldosAntes.venta);

    expect(await filaEntrada(entrada.id)).toMatchObject({
      cortesia_estado: 'anulada',
      cortesia_entregada_por: usuarioId
    });

    // Anulada no se entrega.
    await expect(
      entregarEntrada({ entradaId: entrada.id, presentacionId: bebida.presentacionId, usuarioId })
    ).rejects.toThrow('Esta entrada ya fue entregada o anulada');

    // Y no se anula dos veces: el dinero no puede entrar dos veces a la caja.
    await expect(anularEntrada({ entradaId: entrada.id, usuarioId })).rejects.toThrow(
      'Esta entrada ya fue entregada o anulada'
    );
    expect((await saldosCaja(cajaId)).transferencia - saldosAntes.transferencia).toBe(10000);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('recorre el ciclo completo de la cortesía: cola, entrega y anulación sin postear dos veces', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cajaId = await cajaAbierta();
    const usuarioId = await primerUsuarioActivo();
    await fijarConfiguracion('costo_entrada', 10000);
    await fijarConfiguracion('monto_base_trago_cortesia_cliente', 10000);
    const bebida = await crearBebida('Ciclo de cortesía', 8000);

    // La puerta cobra dos personas: ambas aparecen en la cola de la barra.
    const porEntregar = await registrarEntrada({
      clienteNombre: 'Ciclo entrega',
      cantidadEntradas: 1,
      metodoPago: 'efectivo',
      fecha: FECHA,
      hora: HORA,
      registradoPor: usuarioId
    });
    const porAnular = await registrarEntrada({
      clienteNombre: 'Ciclo anulación',
      cantidadEntradas: 1,
      metodoPago: 'efectivo',
      fecha: FECHA,
      hora: HORA,
      registradoPor: usuarioId
    });
    const saldosAntes = await saldosCaja(cajaId);
    const cola = async () => (await listarPendientes(FECHA)).map(fila => fila.id);
    expect(await cola()).toEqual(expect.arrayContaining([porEntregar.id, porAnular.id]));

    // 1) La barra entrega la primera: sale de la cola y postea su monto a caja.
    const entrega = await entregarEntrada({
      entradaId: porEntregar.id,
      presentacionId: bebida.presentacionId,
      usuarioId
    });
    expect(entrega.tipo).toBe('cortesia');

    const colaTrasEntrega = await cola();
    expect(colaTrasEntrega).not.toContain(porEntregar.id);
    // La otra persona sigue esperando su bebida.
    expect(colaTrasEntrega).toContain(porAnular.id);
    expect((await saldosCaja(cajaId)).efectivo - saldosAntes.efectivo).toBe(10000);

    // Lo entregado no admite anular: volver a postear el monto duplicaría el
    // dinero de esa entrada en caja.
    await expect(anularEntrada({ entradaId: porEntregar.id, usuarioId })).rejects.toThrow(
      'Esta entrada ya fue entregada o anulada'
    );
    expect((await saldosCaja(cajaId)).efectivo - saldosAntes.efectivo).toBe(10000);

    // 2) La segunda se anula desde la cola: también sale y postea su monto.
    const anulacion = await anularEntrada({ entradaId: porAnular.id, usuarioId });
    expect(anulacion.monto).toBe(10000);
    expect(await cola()).not.toContain(porAnular.id);

    // Lo anulado no admite entrega: ni bebida ni dinero extra.
    await expect(
      entregarEntrada({ entradaId: porAnular.id, presentacionId: bebida.presentacionId, usuarioId })
    ).rejects.toThrow('Esta entrada ya fue entregada o anulada');

    // Cada entrada postó su monto exactamente una vez (20.000 en total) y la
    // bebida salió del bar una sola vez.
    const saldosFinales = await saldosCaja(cajaId);
    expect(saldosFinales.efectivo - saldosAntes.efectivo).toBe(20000);
    expect(saldosFinales.venta - saldosAntes.venta).toBe(0);
    const [movimientos] = await query<{ total: number }[]>(
      'SELECT COUNT(*)::int AS total FROM inventario_movimientos WHERE presentacion_id = ?',
      [bebida.presentacionId]
    );
    expect(movimientos.total).toBe(1);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('exige y entrega el acompañamiento incluido en la botella de cortesía', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const cajaId = await cajaAbierta();
    const usuarioId = await primerUsuarioActivo();
    await fijarConfiguracion('costo_entrada', 10000);
    await fijarConfiguracion('monto_base_trago_cortesia_cliente', 10000);
    // La botella exige 2 unidades de acompañamiento (lo pide la opción botella).
    const bebida = await crearBebidaConAcompanamiento('Botella con acompañamiento', 8000, 2);
    const acompanamiento = await crearAcompanamiento('Analcohólica de cortesía', 2);

    const entrada = await registrarEntrada({
      clienteNombre: 'Botella con acompañamiento',
      cantidadEntradas: 1,
      metodoPago: 'efectivo',
      fecha: FECHA,
      hora: HORA,
      registradoPor: usuarioId
    });
    const saldosAntes = await saldosCaja(cajaId);

    // Sin el acompañamiento no se entrega: la fila sigue en la cola.
    await expect(
      entregarEntrada({ entradaId: entrada.id, presentacionId: bebida.presentacionId, usuarioId })
    ).rejects.toThrow('Selecciona el acompañamiento incluido en esta bebida');
    expect(await filaEntrada(entrada.id)).toMatchObject({ cortesia_estado: 'pendiente' });
    expect(await saldosCaja(cajaId)).toEqual(saldosAntes);
    expect((await listarPendientes(FECHA)).map(fila => fila.id)).toContain(entrada.id);

    // Con el acompañamiento la entrega es cortesía y sale de la cola.
    const entrega = await entregarEntrada({
      entradaId: entrada.id,
      presentacionId: bebida.presentacionId,
      acompanamientoPresentacionId: acompanamiento.presentacionId,
      usuarioId
    });
    expect(entrega).toMatchObject({ tipo: 'cortesia', montoCobrarBarra: 0 });
    expect((await listarPendientes(FECHA)).map(fila => fila.id)).not.toContain(entrada.id);

    // La fila guarda qué se acompañó y el detalle lo registra por separado.
    const [fila] = await query<{ bebida_acompanamiento_presentacion_id: string | null }[]>(
      'SELECT bebida_acompanamiento_presentacion_id FROM entradas_clientes WHERE id = ?',
      [entrada.id]
    );
    expect(fila.bebida_acompanamiento_presentacion_id).toBe(acompanamiento.presentacionId);
    const [detalle] = await query<{ acompanamiento_presentacion_id: string | null }[]>(
      'SELECT acompanamiento_presentacion_id FROM entradas_clientes_productos WHERE entrada_id = ?',
      [entrada.id]
    );
    expect(detalle.acompanamiento_presentacion_id).toBe(acompanamiento.presentacionId);

    // Salieron del bar la botella y las 2 unidades de acompañamiento.
    const unidades = await query<{ estado: string }[]>(
      `SELECT estado FROM inventario_unidades WHERE presentacion_id IN (?)`,
      [[bebida.presentacionId, acompanamiento.presentacionId]]
    );
    expect(unidades).toHaveLength(3);
    for (const unidad of unidades) expect(unidad.estado).toBe(ESTADO_UNIDAD_VENDIDA);

    // Una cortesía por unidad entregada: 1 de la bebida + 2 del acompañamiento.
    const [movimientos] = await query<{ total: number }[]>(
      `SELECT COUNT(*)::int AS total FROM inventario_movimientos
        WHERE tipo = 'cortesia' AND presentacion_id IN (?)`,
      [[bebida.presentacionId, acompanamiento.presentacionId]]
    );
    expect(movimientos.total).toBe(3);

    // La caja postea la entrada una sola vez; la cortesía no genera venta.
    const saldosFinales = await saldosCaja(cajaId);
    expect(saldosFinales.efectivo - saldosAntes.efectivo).toBe(10000);
    expect(saldosFinales.venta - saldosAntes.venta).toBe(0);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('no admite acompañamiento en una bebida que no lo tiene configurado', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const usuarioId = await primerUsuarioActivo();
    await fijarConfiguracion('costo_entrada', 10000);
    await fijarConfiguracion('monto_base_trago_cortesia_cliente', 10000);
    const bebida = await crearBebida('Botella sin acompañamiento', 8000);
    const acompanamiento = await crearAcompanamiento('Analcohólica que sobra', 1);

    const entrada = await registrarEntrada({
      clienteNombre: 'Botella sin acompañamiento',
      cantidadEntradas: 1,
      metodoPago: 'efectivo',
      fecha: FECHA,
      hora: HORA,
      registradoPor: usuarioId
    });

    await expect(
      entregarEntrada({
        entradaId: entrada.id,
        presentacionId: bebida.presentacionId,
        acompanamientoPresentacionId: acompanamiento.presentacionId,
        usuarioId
      })
    ).rejects.toThrow('La bebida seleccionada no tiene acompañamiento configurado');

    expect(await filaEntrada(entrada.id)).toMatchObject({ cortesia_estado: 'pendiente' });
    // El acompañamiento que sobra sigue en el bar.
    const [unidad] = await query<{ estado: string }[]>(
      'SELECT estado FROM inventario_unidades WHERE id = ?',
      [acompanamiento.unidadIds[0]]
    );
    expect(unidad.estado).toBe(ESTADO_UNIDAD_ACTIVA);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});
