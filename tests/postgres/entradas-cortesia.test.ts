import { afterAll, expect, it } from 'vitest';

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
import { ESTADO_UNIDAD_ACTIVA } from '@/modules/inventario/estados';

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
}

/** Bebida con una unidad en el bar, al precio de lista indicado. */
async function crearBebida(nombre: string, precio: number): Promise<Bebida> {
  const productoId = crypto.randomUUID();
  const presentacionId = crypto.randomUUID();
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
    [crypto.randomUUID(), productoId, presentacionId, `${codigo}U`, ESTADO_UNIDAD_ACTIVA]
  );

  return { productoId, presentacionId };
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
