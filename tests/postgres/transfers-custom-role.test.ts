import { afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import db, { withTransaction, type TransactionQuery } from '@/lib/database/db';
import { ESTADO_UNIDAD_ACTIVA, aceptarTransferencia, traspasarAlBar } from '@/modules/inventario';
import { conContextoOperacionExistente } from '@/tests/setup/contexto-operacion';

/**
 * Flujo completo bodega → bar con un rol que no se llama Barman: la aprobación
 * tiene que decidirse por el par `products/accept_transfer` de
 * `role_permissions` (el mismo que exige `PATCH /api/transfers`), no por el
 * nombre del rol.
 *
 * Cada caso corre dentro de una transacción que se revierte al final: crea su
 * propio rol, usuarios, producto y stock para no tocar la base de desarrollo.
 */

const ROLLBACK = 'rollback: fixture de traspaso con rol personalizado';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

async function crearRol(
  trx: TransactionQuery,
  nombre: string,
  conPermiso: boolean
): Promise<string> {
  const rolId = randomUUID();
  await trx(
    `INSERT INTO roles (id_rol, nombre, descripcion, estado, fecha_crea)
     VALUES (?, ?, 'Fixture de traspaso', 1, now())`,
    [rolId, nombre]
  );
  if (conPermiso) {
    const permiso = await trx<Array<{ id: string }>>(
      `SELECT id FROM permissions
        WHERE module = 'products' AND action = 'accept_transfer' AND deleted_at IS NULL
        LIMIT 1`
    );
    if (!permiso.length) {
      throw new Error(
        'Falta products/accept_transfer en el catálogo: corré las migraciones antes del test'
      );
    }
    await trx(
      `INSERT INTO role_permissions (id, role_id, permission_id, created_at)
       VALUES (?, ?, ?, now())`,
      [randomUUID(), rolId, permiso[0].id]
    );
  }
  return rolId;
}

async function crearUsuario(trx: TransactionQuery, rolId: string, nick: string): Promise<string> {
  const id = randomUUID();
  await trx(
    `INSERT INTO usuarios
       (id_usuario, run, nick, nombre, apellido, direccion, telefono, estado_civil, afp,
        aporte, sueldo, password, rol_id, estado, fecha_crea)
     VALUES (?, ?, ?, 'Fixture', 'Traspaso', 'Calle 1', '+560000000', 'soltero', 'ninguna',
             0, 0, 'x', ?, 1, now())`,
    [id, `RUN-${id.slice(0, 8)}`, nick, rolId]
  );
  return id;
}

async function crearProductoConStock(
  trx: TransactionQuery,
  cantidad: number
): Promise<{ productoId: string; presentacionId: string }> {
  const productoId = randomUUID();
  const presentacionId = randomUUID();
  const sufijo = productoId.slice(0, 8);
  await trx(
    `INSERT INTO productos (id_producto, codigo, nombre, precio, comision, descripcion, fecha_crea)
     VALUES (?, ?, 'Producto rol personalizado', 90000, 10000, 'Fixture traspaso', now())`,
    [productoId, `TR${sufijo}`]
  );
  await trx(
    `INSERT INTO inventario_presentaciones
       (id, producto_id, nombre, precio_venta, comision, ml_botella, fecha_crea)
     VALUES (?, ?, '1000 ml', 90000, 10000, 1000, now())`,
    [presentacionId, productoId]
  );
  for (let index = 0; index < cantidad; index += 1) {
    await trx(
      `INSERT INTO inventario_unidades
         (id, producto_id, presentacion_id, codigo, ubicacion, estado, ml_restante, fecha_crea)
       VALUES (?, ?, ?, ?, 'almacen', ?, 1000, now())`,
      [randomUUID(), productoId, presentacionId, `TU${sufijo}${index}`, ESTADO_UNIDAD_ACTIVA]
    );
  }
  return { productoId, presentacionId };
}

const opciones = [
  { tipo: 'botella' as const, precio: 90000, comision: 10000 },
  { tipo: 'shot' as const, precio: 6000, comision: 0 }
];

it('un rol personalizado con products/accept_transfer aprueba el traspaso de punta a punta', async () => {
  try {
    await withTransaction(async trx => {
      const sufijo = randomUUID().slice(0, 8);
      const rolId = await crearRol(trx, `Encargado de bar ${sufijo}`, true);
      const remitente = await crearUsuario(trx, rolId, `fixture-envia-${sufijo}`);
      const aprobador = await crearUsuario(trx, rolId, `fixture-aprueba-${sufijo}`);
      const { productoId, presentacionId } = await crearProductoConStock(trx, 2);

      const traspaso = await conContextoOperacionExistente(trx, contexto =>
        traspasarAlBar(
          {
            producto_id: productoId,
            presentacion_id: presentacionId,
            cantidad: 2,
            usuario_id: remitente,
            opciones_venta: opciones
          },
          contexto
        )
      );
      expect(traspaso).toMatchObject({ trasladadas: 2, stock_bar: 0 });
      const transferenciaId = traspaso.transferencia_id;
      if (!transferenciaId) throw new Error('El traspaso no devolvió id');

      const [pendiente] = await trx<Array<{ estado: string }>>(
        'SELECT estado FROM inventario_movimientos WHERE id = ?',
        [transferenciaId]
      );
      expect(pendiente.estado).toBe('pendiente');

      // El aprobador solo tiene el par del catálogo: ni se llama Barman ni es
      // administrador, y aun así la recepción tiene que quedar confirmada.
      await conContextoOperacionExistente(trx, contexto =>
        aceptarTransferencia(transferenciaId, aprobador, contexto)
      );

      const [movimiento] = await trx<
        Array<{ estado: string; aceptado_por: string; fecha_aceptacion: Date | null }>
      >(
        `SELECT estado, aceptado_por, fecha_aceptacion
           FROM inventario_movimientos WHERE id = ?`,
        [transferenciaId]
      );
      expect(movimiento.estado).toBe('aceptada');
      expect(movimiento.aceptado_por).toBe(aprobador);
      expect(movimiento.fecha_aceptacion).not.toBeNull();

      const unidades = await trx<Array<{ ubicacion: string; transferencia_id: string | null }>>(
        'SELECT ubicacion, transferencia_id FROM inventario_unidades WHERE presentacion_id = ?',
        [presentacionId]
      );
      expect(unidades).toHaveLength(2);
      for (const unidad of unidades) {
        expect(unidad.ubicacion).toBe('bar');
        expect(unidad.transferencia_id).toBeNull();
      }

      const [presentacion] = await trx<Array<{ precio_venta: number; comision: number }>>(
        'SELECT precio_venta, comision FROM inventario_presentaciones WHERE id = ?',
        [presentacionId]
      );
      expect(Number(presentacion.precio_venta)).toBe(90000);
      expect(Number(presentacion.comision)).toBe(10000);

      throw new Error(ROLLBACK);
    });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== ROLLBACK) throw error;
  }
});

it('el administrador puede aceptar el traspaso que él mismo envió', async () => {
  try {
    await withTransaction(async trx => {
      const sufijo = randomUUID().slice(0, 8);
      const rolId = await crearRol(trx, 'Administrador', false);
      const admin = await crearUsuario(trx, rolId, `fixture-admin-auto-${sufijo}`);
      const { productoId, presentacionId } = await crearProductoConStock(trx, 1);

      const traspaso = await conContextoOperacionExistente(trx, contexto =>
        traspasarAlBar(
          {
            producto_id: productoId,
            presentacion_id: presentacionId,
            cantidad: 1,
            usuario_id: admin,
            opciones_venta: opciones
          },
          contexto
        )
      );
      const transferenciaId = traspaso.transferencia_id;
      if (!transferenciaId) throw new Error('El traspaso no devolvió id');

      await conContextoOperacionExistente(trx, contexto =>
        aceptarTransferencia(transferenciaId, admin, contexto)
      );

      const [movimiento] = await trx<
        Array<{ estado: string; aceptado_por: string; fecha_aceptacion: Date | null }>
      >(
        `SELECT estado, aceptado_por, fecha_aceptacion
           FROM inventario_movimientos WHERE id = ?`,
        [transferenciaId]
      );
      expect(movimiento.estado).toBe('aceptada');
      expect(movimiento.aceptado_por).toBe(admin);

      const unidades = await trx<Array<{ ubicacion: string }>>(
        'SELECT ubicacion FROM inventario_unidades WHERE presentacion_id = ?',
        [presentacionId]
      );
      expect(unidades).toHaveLength(1);
      expect(unidades[0].ubicacion).toBe('bar');

      throw new Error(ROLLBACK);
    });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== ROLLBACK) throw error;
  }
});

it('el mismo rol sin el par no aprueba: el nombre del rol no concede nada', async () => {
  try {
    await withTransaction(async trx => {
      const sufijo = randomUUID().slice(0, 8);
      const rolId = await crearRol(trx, `Encargado sin permiso ${sufijo}`, false);
      const remitente = await crearUsuario(trx, rolId, `fixture-envia-sin-${sufijo}`);
      const aprobador = await crearUsuario(trx, rolId, `fixture-aprueba-sin-${sufijo}`);
      const { productoId, presentacionId } = await crearProductoConStock(trx, 1);

      const traspaso = await conContextoOperacionExistente(trx, contexto =>
        traspasarAlBar(
          {
            producto_id: productoId,
            presentacion_id: presentacionId,
            cantidad: 1,
            usuario_id: remitente,
            opciones_venta: opciones
          },
          contexto
        )
      );
      const transferenciaId = traspaso.transferencia_id;
      if (!transferenciaId) throw new Error('El traspaso no devolvió id');

      await expect(
        conContextoOperacionExistente(trx, contexto =>
          aceptarTransferencia(transferenciaId, aprobador, contexto)
        )
      ).rejects.toThrow('No tienes permiso para aceptar la transferencia');

      const [movimiento] = await trx<Array<{ estado: string }>>(
        'SELECT estado FROM inventario_movimientos WHERE id = ?',
        [transferenciaId]
      );
      expect(movimiento.estado).toBe('pendiente');

      const unidades = await trx<Array<{ ubicacion: string }>>(
        'SELECT ubicacion FROM inventario_unidades WHERE presentacion_id = ?',
        [presentacionId]
      );
      expect(unidades).toHaveLength(1);
      expect(unidades[0].ubicacion).toBe('transito');

      throw new Error(ROLLBACK);
    });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== ROLLBACK) throw error;
  }
});
