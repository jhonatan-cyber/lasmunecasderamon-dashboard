import { generateUUID, query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { ValidationError } from '@/lib/errors/errors';
import { consumirProductoCortesiaBar } from '@/modules/inventario';
import { enUnaUnidad } from '@/lib/transaccion/contrato';
import { resolverTransaccion } from '@/lib/transaccion/infraestructura';
import { SaleService } from '@/workflows/ventas';
import { registrarMovimientoCobro } from '@/modules/caja';
import { ejecutarEfectosConfirmados } from '@/lib/transaccion/efectos';

export interface EntradaCliente {
  id: string;
  cliente_nombre: string | null;
  monto_entrada: number;
  monto_bebida_adicional: number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia';
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
    `SELECT e.id, e.cliente_nombre, e.monto_entrada, e.monto_bebida_adicional, e.metodo_pago,
            e.cover_presentacion_id AS bebida_cortesia_presentacion_id,
            CASE WHEN e.cover_presentacion_id IS NULL THEN NULL
                 ELSE pr.nombre || ' · ' || p.nombre END AS bebida_cortesia,
            CASE WHEN e.bebida_acompanamiento_presentacion_id IS NULL THEN NULL
                 ELSE pra.nombre || ' · ' || pa.nombre END AS acompanamiento_bebida,
            e.fecha, to_char(e.hora, 'HH24:MI') AS hora,
            u.nombre || ' ' || u.apellido AS registrado_por_nombre
       FROM entradas_clientes e
       JOIN usuarios u ON u.id_usuario = e.registrado_por
       LEFT JOIN inventario_presentaciones p ON p.id = e.cover_presentacion_id
       LEFT JOIN productos pr ON pr.id_producto = p.producto_id
       LEFT JOIN inventario_presentaciones pa ON pa.id = e.bebida_acompanamiento_presentacion_id
       LEFT JOIN productos pra ON pra.id_producto = pa.producto_id
      WHERE e.fecha = ? ORDER BY e.hora DESC, e.fecha_crea DESC`,
    [fechaFiltro]
  );
}

export async function registrarEntrada(input: {
  clienteNombre?: string;
  montoEntrada: number;
  montoBebidaAdicional: number;
  metodoPago: string;
  bebidaCortesiaPresentacionId?: string | null;
  bebidaAcompanamientoPresentacionId?: string | null;
  fecha: string;
  hora: string;
  registradoPor: string;
}) {
  if (!input.registradoPor) throw new ValidationError('No se pudo identificar al usuario');
  for (const [field, amount] of [
    ['entrada', input.montoEntrada],
    ['bebida adicional', input.montoBebidaAdicional]
  ] as const) {
    if (!Number.isInteger(amount) || amount < 0 || amount > 2147483647)
      throw new ValidationError(`El monto de ${field} debe ser un entero igual o mayor a cero`);
  }
  if (input.montoEntrada + input.montoBebidaAdicional <= 0)
    throw new ValidationError('Indica el monto de la entrada o de la bebida adicional');
  if (!['efectivo', 'tarjeta', 'transferencia'].includes(input.metodoPago))
    throw new ValidationError('Selecciona un método de pago válido');
  if (input.bebidaAcompanamientoPresentacionId && !input.bebidaCortesiaPresentacionId)
    throw new ValidationError('Selecciona primero la bebida para registrar su acompañamiento');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha) || isNaN(Date.parse(`${input.fecha}T00:00:00`)))
    throw new ValidationError('La fecha no es válida');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.hora))
    throw new ValidationError('La hora debe tener formato HH:MM');

  const id = generateUUID();
  const fechaHora = `${input.fecha} ${input.hora}:00`;
  let cajaId = '';
  const tareasConfirmadas: Array<() => void | Promise<void>> = [];
  await enUnaUnidad(async unidad => {
    const trx = resolverTransaccion({ id: unidad.id });
    const caja = await trx<{ id_caja: string }[]>(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1 FOR UPDATE'
    );
    if (!caja.length) throw new ValidationError('Abre una caja antes de registrar entradas');
    cajaId = caja[0].id_caja;
    if (input.montoBebidaAdicional > 0 && !input.bebidaCortesiaPresentacionId)
      throw new ValidationError('Selecciona la bebida para registrar el adicional como venta');
    if (input.montoBebidaAdicional === 0 && input.bebidaCortesiaPresentacionId) {
      await consumirProductoCortesiaBar(
        input.bebidaCortesiaPresentacionId,
        input.registradoPor,
        fechaHora,
        { id: unidad.id },
        input.montoEntrada + input.montoBebidaAdicional,
        input.bebidaAcompanamientoPresentacionId || null
      );
    }
    await trx(
      `INSERT INTO entradas_clientes
        (id, cliente_nombre, monto_entrada, monto_bebida_adicional, metodo_pago, cover_presentacion_id,
         bebida_acompanamiento_presentacion_id, fecha, hora, caja_id, registrado_por, fecha_crea)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.clienteNombre?.trim() || null,
        input.montoEntrada,
        input.montoBebidaAdicional,
        input.metodoPago,
        input.bebidaCortesiaPresentacionId || null,
        input.bebidaAcompanamientoPresentacionId || null,
        input.fecha,
        input.hora,
        cajaId,
        input.registradoPor,
        fechaHora
      ]
    );
    if (input.montoEntrada > 0) {
      // El monto base se registra en caja según su método, sin incrementar ventas.
      const pagosEntrada = { efectivo: 0, tarjeta: 0, transferencia: 0 };
      pagosEntrada[input.metodoPago as keyof typeof pagosEntrada] = input.montoEntrada;
      await registrarMovimientoCobro(cajaId, pagosEntrada, { id: unidad.id });
    }
    if (input.montoBebidaAdicional > 0 && input.bebidaCortesiaPresentacionId) {
      const productos = await trx<
        {
          producto_id: string;
          opciones_venta: unknown;
          precio_venta: number;
        }[]
      >(
        'SELECT producto_id, opciones_venta, precio_venta FROM inventario_presentaciones WHERE id = ? LIMIT 1',
        [input.bebidaCortesiaPresentacionId]
      );
      if (!productos.length) throw new ValidationError('La bebida seleccionada ya no existe');
      if (Number(productos[0].precio_venta) > input.montoEntrada + input.montoBebidaAdicional)
        throw new ValidationError('La bebida supera el monto de entrada más el adicional');
      let opcionesVenta = productos[0].opciones_venta;
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
      if (unidadesAcompanamiento > 0 && !input.bebidaAcompanamientoPresentacionId)
        throw new ValidationError('Selecciona el acompañamiento configurado para esta bebida');
      if (unidadesAcompanamiento <= 0 && input.bebidaAcompanamientoPresentacionId)
        throw new ValidationError('La bebida seleccionada no tiene acompañamiento configurado');
      await SaleService.createSale(
        {
          total: input.montoBebidaAdicional,
          sub_total: input.montoBebidaAdicional,
          total_comision: 0,
          metodo_pago: input.metodoPago as 'efectivo' | 'tarjeta' | 'transferencia',
          propina: 0,
          tiempo: 0,
          usuarios: [],
          detalles: [
            {
              producto_id: productos[0].producto_id,
              presentacion_id: input.bebidaCortesiaPresentacionId,
              tipo_venta: 'botella',
              precio: input.montoBebidaAdicional,
              comision: 0,
              cantidad: 1,
              sub_total: input.montoBebidaAdicional,
              ...(input.bebidaAcompanamientoPresentacionId
                ? {
                    acompanamiento_botella: {
                      presentacion_id: input.bebidaAcompanamientoPresentacionId,
                      unidades: unidadesAcompanamiento
                    }
                  }
                : {})
            }
          ]
        },
        input.registradoPor,
        {
          contexto: { id: unidad.id },
          entradaId: id,
          onAfterCommit: tarea => tareasConfirmadas.push(tarea)
        }
      );
    }
  });
  await ejecutarEfectosConfirmados(tareasConfirmadas);
  return { id, caja_id: cajaId };
}
