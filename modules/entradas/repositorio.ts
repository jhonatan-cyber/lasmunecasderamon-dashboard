import { generateUUID, query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { ValidationError } from '@/lib/errors/errors';
import { consumirProductoCortesiaBar } from '@/modules/inventario';
import { enUnaUnidad } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { registrarMovimientoCobro } from '@/modules/caja';
import { ejecutarEfectosConfirmados } from '@/lib/transaccion/efectos';

/** Plan de la venta de cortesía: el adaptador HTTP la registra con SaleService. */
export interface PlanVentaEntrada {
  totalVenta: number;
  metodoPago: 'efectivo' | 'tarjeta' | 'transferencia';
  usuarioId: string;
  entradaId: string;
  detalles: Record<string, unknown>[];
}

export interface EntradaCliente {
  id: string;
  grupo_registro_id: string | null;
  cantidad_productos_cortesia: number;
  cliente_nombre: string | null;
  monto_entrada: number;
  monto_bebida_adicional: number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia';
  venta_id: string | null;
  bebida_cortesia_presentacion_id: string | null;
  bebida_cortesia: string | null;
  bebida_acompanamiento_presentacion_id: string | null;
  acompanamiento_bebida: string | null;
  fecha: string;
  hora: string;
  registrado_por_nombre: string;
}

export async function listarEntradas(fecha?: string): Promise<EntradaCliente[]> {
  const fechaFiltro = fecha || getNowInBusinessTimezone().slice(0, 10);
  return query<EntradaCliente[]>(
    `SELECT e.id, e.grupo_registro_id, e.cliente_nombre, e.monto_entrada, e.monto_bebida_adicional, e.metodo_pago,
            v.id_venta AS venta_id,
            e.cover_presentacion_id AS bebida_cortesia_presentacion_id,
            CASE WHEN e.cover_presentacion_id IS NULL THEN NULL
                 ELSE pr.nombre || ' · ' || p.nombre END AS bebida_cortesia,
            CASE WHEN e.bebida_acompanamiento_presentacion_id IS NULL THEN NULL
                 ELSE pra.nombre || ' · ' || pa.nombre END AS acompanamiento_bebida,
            COALESCE((SELECT string_agg(
              prd.nombre || ' · ' || pd.nombre || ' × ' || d.cantidad::text ||
              CASE WHEN d.acompanamiento_presentacion_id IS NULL THEN '' ELSE
                ' + ' || pra2.nombre || ' · ' || pa2.nombre END, ', ' ORDER BY prd.nombre, pd.nombre)
              FROM entradas_clientes_productos d
              JOIN inventario_presentaciones pd ON pd.id = d.presentacion_id
              JOIN productos prd ON prd.id_producto = pd.producto_id
              LEFT JOIN inventario_presentaciones pa2 ON pa2.id = d.acompanamiento_presentacion_id
              LEFT JOIN productos pra2 ON pra2.id_producto = pa2.producto_id
              WHERE d.entrada_id = e.id),
              CASE WHEN e.cover_presentacion_id IS NULL THEN NULL ELSE pr.nombre || ' · ' || p.nombre END
            ) AS productos_cortesia,
            COALESCE((SELECT SUM(d.cantidad) FROM entradas_clientes_productos d WHERE d.entrada_id = e.id),
                     CASE WHEN e.cover_presentacion_id IS NULL THEN 0 ELSE 1 END) AS cantidad_productos_cortesia,
            e.fecha, to_char(e.hora, 'HH24:MI') AS hora,
            u.nombre || ' ' || u.apellido AS registrado_por_nombre
       FROM entradas_clientes e
       JOIN usuarios u ON u.id_usuario = e.registrado_por
       LEFT JOIN ventas v ON v.entrada_id = e.id
       LEFT JOIN inventario_presentaciones p ON p.id = e.cover_presentacion_id
       LEFT JOIN productos pr ON pr.id_producto = p.producto_id
       LEFT JOIN inventario_presentaciones pa ON pa.id = e.bebida_acompanamiento_presentacion_id
       LEFT JOIN productos pra ON pra.id_producto = pa.producto_id
      WHERE e.fecha = ? ORDER BY e.hora DESC, e.fecha_crea DESC`,
    [fechaFiltro]
  );
}

export interface ParteEntrada {
  montoBebidaAdicional: number;
  bebidaCortesiaPresentacionId?: string | null;
  bebidaAcompanamientoPresentacionId?: string | null;
}

export interface ProductoCortesiaEntrada {
  presentacionId: string;
  cantidad: number;
  acompanamientoPresentacionId?: string | null;
}

export async function registrarEntrada(
  input: {
    clienteNombre?: string;
    montoEntrada: number;
    metodoPago: string;
    fecha: string;
    hora: string;
    registradoPor: string;
    partes: ParteEntrada[];
    productosCortesia?: ProductoCortesiaEntrada[];
  },
  /** El adaptador HTTP registra la venta (SaleService) con el plan de este módulo. */
  onVenta?: (
    plan: PlanVentaEntrada,
    contexto: { id: string },
    asignarTarea: (tarea: () => void | Promise<void>) => void
  ) => Promise<void>
) {
  const partes = input.partes;
  if (!input.registradoPor) throw new ValidationError('No se pudo identificar al usuario');
  const productosCortesia = input.productosCortesia ?? [];
  for (const producto of productosCortesia) {
    if (
      !producto.presentacionId ||
      !Number.isInteger(producto.cantidad) ||
      producto.cantidad < 1 ||
      producto.cantidad > 1000
    )
      throw new ValidationError('Cada producto debe tener una presentación y una cantidad válida');
    if (
      producto.acompanamientoPresentacionId &&
      producto.acompanamientoPresentacionId === producto.presentacionId
    )
      throw new ValidationError('El producto y su acompañamiento deben ser distintos');
  }
  if (!Array.isArray(partes) || partes.length < 1)
    throw new ValidationError('Indica al menos una entrada para registrar');
  const montoPorEntrada = input.montoEntrada / partes.length;
  if (!Number.isInteger(input.montoEntrada) || input.montoEntrada < 0)
    throw new ValidationError('El monto de entrada debe ser un entero igual o mayor a cero');
  if (partes.length > 1 && !Number.isInteger(montoPorEntrada))
    throw new ValidationError('El monto base de entrada no se reparte en partes iguales');
  for (const [index, parte] of partes.entries()) {
    const adicional = Number(parte?.montoBebidaAdicional);
    if (!Number.isInteger(adicional) || adicional < 0 || adicional > 2147483647)
      throw new ValidationError(
        `El monto de bebida adicional de la entrada ${index + 1} debe ser un entero igual o mayor a cero`
      );
    if (adicional > 0 && !parte.bebidaCortesiaPresentacionId)
      throw new ValidationError(
        `Selecciona la bebida de la entrada ${index + 1} para registrar el adicional como venta`
      );
    if (parte.bebidaAcompanamientoPresentacionId && !parte.bebidaCortesiaPresentacionId)
      throw new ValidationError(
        `Selecciona primero la bebida de la entrada ${index + 1} para registrar su acompañamiento`
      );
  }
  const totalAdicionales = partes.reduce(
    (sum, parte) => sum + Number(parte.montoBebidaAdicional),
    0
  );
  const totalProductosCortesia = productosCortesia.reduce(
    (sum, producto) => sum + producto.cantidad,
    0
  );
  if (totalAdicionales === 0 && totalProductosCortesia !== partes.length)
    throw new ValidationError(
      `Selecciona exactamente ${partes.length} producto(s), uno por entrada`
    );
  if (input.montoEntrada + totalAdicionales <= 0)
    throw new ValidationError('Indica el monto de la entrada o de la bebida adicional');
  // La venta de cortesías la registra el adaptador HTTP (SaleService, §5): sin
  // adaptador no hay forma de dejar la venta y se cancela antes de escribir.
  if (totalAdicionales > 0 && !onVenta)
    throw new ValidationError('La bebida adicional requiere registrar una venta');
  if (!['efectivo', 'tarjeta', 'transferencia'].includes(input.metodoPago))
    throw new ValidationError('Selecciona un método de pago válido');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha) || isNaN(Date.parse(`${input.fecha}T00:00:00`)))
    throw new ValidationError('La fecha no es válida');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.hora))
    throw new ValidationError('La hora debe tener formato HH:MM');

  const fechaHora = `${input.fecha} ${input.hora}:00`;
  let cajaId = '';
  const ids: string[] = [];
  const grupoRegistroId = generateUUID();
  const productosEnUnidades = productosCortesia.flatMap(producto =>
    Array.from({ length: producto.cantidad }, () => ({ ...producto, cantidad: 1 }))
  );
  const tareasConfirmadas: Array<() => void | Promise<void>> = [];
  await enUnaUnidad(async unidad => {
    const trx = resolverTransaccion({ id: unidad.id });
    const caja = await trx<{ id_caja: string }[]>(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1 FOR UPDATE'
    );
    if (!caja.length) throw new ValidationError('Abre una caja antes de registrar entradas');
    cajaId = caja[0].id_caja;
    if (totalAdicionales > 0) {
      let valorProductos = 0;
      for (const producto of productosCortesia) {
        const presentaciones = await trx<{ precio_venta: number }[]>(
          'SELECT precio_venta FROM inventario_presentaciones WHERE id = ? LIMIT 1',
          [producto.presentacionId]
        );
        if (!presentaciones.length)
          throw new ValidationError('Uno de los productos seleccionados ya no existe');
        valorProductos += Number(presentaciones[0].precio_venta) * producto.cantidad;
      }
      if (valorProductos !== input.montoEntrada + totalAdicionales)
        throw new ValidationError(
          `Los productos deben sumar exactamente ${input.montoEntrada + totalAdicionales}`
        );
    }
    for (const [index, parte] of partes.entries()) {
      const id = generateUUID();
      ids.push(id);
      const adicional = Number(parte.montoBebidaAdicional);
      if (
        totalAdicionales === 0 &&
        productosCortesia.length === 0 &&
        adicional === 0 &&
        parte.bebidaCortesiaPresentacionId
      ) {
        await consumirProductoCortesiaBar(
          parte.bebidaCortesiaPresentacionId,
          input.registradoPor,
          fechaHora,
          { id: unidad.id },
          montoPorEntrada + adicional,
          parte.bebidaAcompanamientoPresentacionId || null
        );
      }
      await trx(
        `INSERT INTO entradas_clientes
          (id, grupo_registro_id, cliente_nombre, monto_entrada, monto_bebida_adicional, metodo_pago, cover_presentacion_id,
           bebida_acompanamiento_presentacion_id, fecha, hora, caja_id, registrado_por, fecha_crea)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          grupoRegistroId,
          input.clienteNombre?.trim() || null,
          montoPorEntrada,
          adicional,
          input.metodoPago,
          parte.bebidaCortesiaPresentacionId || null,
          parte.bebidaAcompanamientoPresentacionId || null,
          input.fecha,
          input.hora,
          cajaId,
          input.registradoPor,
          fechaHora
        ]
      );
      const asignados = productosEnUnidades.filter(
        (_, productoIndex) => productoIndex % partes.length === index
      );
      if (asignados.length) {
        const productosAgrupados = new Map<string, ProductoCortesiaEntrada>();
        for (const producto of asignados) {
          const existente = productosAgrupados.get(producto.presentacionId);
          if (existente) existente.cantidad += 1;
          else productosAgrupados.set(producto.presentacionId, { ...producto, cantidad: 1 });
          if (totalAdicionales === 0)
            await consumirProductoCortesiaBar(
              producto.presentacionId,
              input.registradoPor,
              fechaHora,
              { id: unidad.id },
              montoPorEntrada,
              producto.acompanamientoPresentacionId || null
            );
        }
        for (const producto of productosAgrupados.values()) {
          await trx(
            `INSERT INTO entradas_clientes_productos
              (entrada_id, presentacion_id, cantidad, acompanamiento_presentacion_id)
             VALUES (?, ?, ?, ?)`,
            [
              id,
              producto.presentacionId,
              producto.cantidad,
              producto.acompanamientoPresentacionId || null
            ]
          );
        }
      }
    }
    if (totalAdicionales > 0) {
      const detalles = [];
      let totalVenta = 0;
      for (const producto of productosCortesia) {
        const presentaciones = await trx<
          { producto_id: string; precio_venta: number; opciones_venta: unknown }[]
        >(
          'SELECT producto_id, precio_venta, opciones_venta FROM inventario_presentaciones WHERE id = ? LIMIT 1 FOR UPDATE',
          [producto.presentacionId]
        );
        const presentacion = presentaciones[0];
        if (!presentacion)
          throw new ValidationError('Uno de los productos seleccionados ya no existe');
        let opcionesVenta = presentacion.opciones_venta;
        if (typeof opcionesVenta === 'string') {
          try {
            opcionesVenta = JSON.parse(opcionesVenta);
          } catch {
            opcionesVenta = [];
          }
        }
        const opciones = Array.isArray(opcionesVenta) ? opcionesVenta : [];
        const unidadesAcompanamiento = Number(
          opciones.find((opcion: { tipo?: string }) => opcion.tipo === 'botella')?.acompanamiento
            ?.unidades ?? 0
        );
        if (unidadesAcompanamiento > 0 && !producto.acompanamientoPresentacionId)
          throw new ValidationError('Selecciona el acompañamiento configurado para cada producto');
        if (unidadesAcompanamiento <= 0 && producto.acompanamientoPresentacionId)
          throw new ValidationError('Uno de los productos no tiene acompañamiento configurado');
        const precio = Number(presentacion.precio_venta);
        const subTotal = precio * producto.cantidad;
        totalVenta += subTotal;
        detalles.push({
          producto_id: presentacion.producto_id,
          presentacion_id: producto.presentacionId,
          tipo_venta: 'botella' as const,
          precio,
          comision: 0,
          cantidad: producto.cantidad,
          sub_total: subTotal,
          ...(producto.acompanamientoPresentacionId
            ? {
                acompanamiento_botella: {
                  presentacion_id: producto.acompanamientoPresentacionId,
                  unidades: unidadesAcompanamiento
                }
              }
            : {})
        });
      }
      if (totalVenta !== input.montoEntrada + totalAdicionales)
        throw new ValidationError(
          'El total de los productos cambió. Actualiza y vuelve a intentar'
        );
      await onVenta!(
        {
          totalVenta,
          metodoPago: input.metodoPago as 'efectivo' | 'tarjeta' | 'transferencia',
          usuarioId: input.registradoPor,
          entradaId: ids[0],
          detalles
        },
        { id: unidad.id },
        tarea => tareasConfirmadas.push(tarea)
      );
    }
    if (input.montoEntrada > 0 && totalAdicionales === 0) {
      const pagosEntrada = { efectivo: 0, tarjeta: 0, transferencia: 0 };
      pagosEntrada[input.metodoPago as keyof typeof pagosEntrada] = input.montoEntrada;
      await registrarMovimientoCobro(cajaId, pagosEntrada, { id: unidad.id });
    }
  });
  await ejecutarEfectosConfirmados(tareasConfirmadas);
  return { id: ids[0], ids, caja_id: cajaId };
}
