import { generateUUID, query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { ValidationError } from '@/lib/errors/errors';
import { consumirCorteCortesiaBar, consumirProductoCortesiaBar } from '@/modules/inventario';
import { enUnaUnidad } from '@/lib/transaction/contract';
import { resolverTransaccion } from '@/lib/transaction/infrastructure';
import { registrarMovimientoCobro } from '@/modules/caja';
import { ejecutarEfectosConfirmados } from '@/lib/transaction/effects';
import { defaultDeClave } from '@/modules/configuracion/contracts';
import { esBaucherDataUrlValido } from '@/lib/business/baucher';
import { eliminarFotoBaucher, guardarFotoBaucher } from '@/lib/utils/image-utils';

export type MetodoPagoEntrada = 'efectivo' | 'tarjeta' | 'transferencia';
export type EstadoCortesia = 'pendiente' | 'entregada' | 'anulada';

const METODOS: readonly MetodoPagoEntrada[] = ['efectivo', 'tarjeta', 'transferencia'];

export interface PlanVentaEntrada {
  totalVenta: number;
  metodoPago: MetodoPagoEntrada;
  usuarioId: string;
  entradaId: string;
  detalles: Record<string, unknown>[];
}

export type RegistradorVenta = (
  plan: PlanVentaEntrada,
  contexto: { id: string },
  asignarTarea: (tarea: () => void | Promise<void>) => void
) => Promise<{ ventaId?: string | null } | void>;

export interface EntradaCliente {
  id: string;
  grupo_registro_id: string | null;
  cantidad_productos_cortesia: number;
  cliente_nombre: string | null;
  monto_entrada: number;
  monto_bebida_adicional: number;
  metodo_pago: MetodoPagoEntrada;
  baucher_foto: string | null;
  caja_id: string | null;
  venta_id: string | null;
  bebida_cortesia_presentacion_id: string | null;
  bebida_cortesia: string | null;
  bebida_acompanamiento_presentacion_id: string | null;
  acompanamiento_bebida: string | null;
  fecha: string;
  hora: string;
  registrado_por_nombre: string;
  cortesia_estado: EstadoCortesia;
  cortesia_entregada_at: string | null;
  cortesia_entregada_por_nombre: string | null;
}

export interface EntradaPendiente {
  id: string;
  grupo_registro_id: string | null;
  cliente_nombre: string | null;
  monto_entrada: number;
  metodo_pago: MetodoPagoEntrada;
  fecha: string;
  hora: string;
  caja_id: string;
  registrado_por_nombre: string;
}

export interface ResultadoEntrega {
  entradaId: string;
  tipo: 'cortesia' | 'upgrade';
  presentacionId: string;
  precio: number;
  montoEntrada: number;
  montoCobrarBarra: number;
  ventaId: string | null;
  cajaId: string;
}

async function leerConfiguracion(clave: string, respaldo: number): Promise<number> {
  const filas = await query<{ valor: string }[]>(
    'SELECT valor FROM configuraciones WHERE clave = ? LIMIT 1',
    [clave]
  );
  const guardado = Number(filas[0]?.valor);
  const valor = Number.isFinite(guardado) ? guardado : (defaultDeClave<number>(clave) ?? respaldo);
  return Number.isFinite(valor) ? Math.floor(valor) : respaldo;
}

async function leerCostoEntrada(): Promise<number> {
  const valor = await leerConfiguracion('costo_entrada', 0);
  if (valor <= 0) throw new ValidationError('El costo de entrada no está configurado');
  return valor;
}

async function leerTopeCortesia(): Promise<number> {
  const valor = await leerConfiguracion('monto_base_trago_cortesia_cliente', 10000);
  return valor >= 0 ? valor : 10000;
}

function parseOpcionesVenta(valor: unknown): Record<string, unknown>[] {
  if (valor == null) return [];
  if (typeof valor === 'string') {
    try {
      const parseado: unknown = JSON.parse(valor);
      return Array.isArray(parseado) ? (parseado as Record<string, unknown>[]) : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(valor) ? (valor as Record<string, unknown>[]) : [];
}

function unidadesAcompanamiento(opciones: Record<string, unknown>[]): number {
  const botella = opciones.find(opcion => opcion?.tipo === 'botella') as
    { acompanamiento?: { unidades?: unknown } } | undefined;
  const unidades = Number(botella?.acompanamiento?.unidades ?? 0);
  return Number.isFinite(unidades) && unidades > 0 ? Math.floor(unidades) : 0;
}

function validarFechaHora(fecha: string, hora: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || isNaN(Date.parse(`${fecha}T00:00:00`)))
    throw new ValidationError('La fecha no es válida');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora))
    throw new ValidationError('La hora debe tener formato HH:MM');
}

function validarMetodoPago(metodo: string): MetodoPagoEntrada {
  if (!METODOS.includes(metodo as MetodoPagoEntrada))
    throw new ValidationError('Selecciona un método de pago válido');
  return metodo as MetodoPagoEntrada;
}

export async function listarEntradas(fecha?: string): Promise<EntradaCliente[]> {
  const fechaFiltro = fecha || getNowInBusinessTimezone().slice(0, 10);
  return query<EntradaCliente[]>(
    `SELECT e.id, e.grupo_registro_id, e.cliente_nombre, e.monto_entrada, e.monto_bebida_adicional, e.metodo_pago,
            e.baucher_foto,
            e.caja_id,
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
            u.nombre || ' ' || u.apellido AS registrado_por_nombre,
            e.cortesia_estado,
            to_char(e.cortesia_entregada_at, 'YYYY-MM-DD HH24:MI') AS cortesia_entregada_at,
            CASE WHEN e.cortesia_entregada_por IS NULL THEN NULL
                 ELSE eu.nombre || ' ' || eu.apellido END AS cortesia_entregada_por_nombre
       FROM entradas_clientes e
       JOIN usuarios u ON u.id_usuario = e.registrado_por
       LEFT JOIN usuarios eu ON eu.id_usuario = e.cortesia_entregada_por
       LEFT JOIN ventas v ON v.entrada_id = e.id
       LEFT JOIN inventario_presentaciones p ON p.id = e.cover_presentacion_id
       LEFT JOIN productos pr ON pr.id_producto = p.producto_id
       LEFT JOIN inventario_presentaciones pa ON pa.id = e.bebida_acompanamiento_presentacion_id
       LEFT JOIN productos pra ON pra.id_producto = pa.producto_id
      WHERE e.fecha = ? ORDER BY e.hora DESC, e.fecha_crea DESC`,
    [fechaFiltro]
  );
}

export async function listarPendientes(fecha?: string): Promise<EntradaPendiente[]> {
  const fechaFiltro = fecha || getNowInBusinessTimezone().slice(0, 10);
  return query<EntradaPendiente[]>(
    `SELECT e.id, e.grupo_registro_id, e.cliente_nombre, e.monto_entrada, e.metodo_pago,
            e.fecha, to_char(e.hora, 'HH24:MI') AS hora, e.caja_id,
            u.nombre || ' ' || u.apellido AS registrado_por_nombre
       FROM entradas_clientes e
       JOIN usuarios u ON u.id_usuario = e.registrado_por
      WHERE e.cortesia_estado = 'pendiente' AND e.fecha = ?
      ORDER BY e.hora ASC, e.fecha_crea ASC`,
    [fechaFiltro]
  );
}

export async function obtenerBaucherEntrada(id: string): Promise<string | null> {
  const filas = await query<{ baucher_foto: string | null }[]>(
    'SELECT baucher_foto FROM entradas_clientes WHERE id = ?',
    [id]
  );
  return filas[0]?.baucher_foto ?? null;
}

export interface RegistroEntradaInput {
  clienteNombre?: string;
  montoEntrada?: number;
  cantidadEntradas: number;
  metodoPago: string;
  baucherFoto?: string;
  fecha: string;
  hora: string;
  registradoPor: string;
}

export async function registrarEntrada(input: RegistroEntradaInput) {
  if (!input.registradoPor) throw new ValidationError('No se pudo identificar al usuario');
  const cantidad = Number(input.cantidadEntradas);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100)
    throw new ValidationError('Indica entre 1 y 100 entradas para registrar');
  const metodoPago = validarMetodoPago(input.metodoPago);
  validarFechaHora(input.fecha, input.hora);
  if (input.baucherFoto && !esBaucherDataUrlValido(input.baucherFoto))
    throw new ValidationError('La foto del baucher no es una imagen válida');
  const costoEntrada = await leerCostoEntrada();
  const montoTotal = costoEntrada * cantidad;
  if (
    input.montoEntrada !== undefined &&
    (!Number.isInteger(input.montoEntrada) || input.montoEntrada !== montoTotal)
  )
    throw new ValidationError(
      `El precio de la entrada no coincide: son ${costoEntrada} por persona (${montoTotal} en total). Actualiza la página y vuelve a intentar.`
    );
  const grupoRegistroId = generateUUID();
  const baucherFoto = input.baucherFoto
    ? await guardarFotoBaucher(input.baucherFoto, 'ticket', {
        grupoRegistroId,
        registradoPor: input.registradoPor
      })
    : null;
  const ids: string[] = [];
  let cajaId = '';
  try {
    await enUnaUnidad(async unidad => {
      const trx = resolverTransaccion({ id: unidad.id });
      const caja = await trx<{ id_caja: string }[]>(
        'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1 FOR UPDATE'
      );
      if (!caja.length) throw new ValidationError('Abre una caja antes de registrar entradas');
      cajaId = caja[0].id_caja;
      for (let indice = 0; indice < cantidad; indice += 1) {
        const id = generateUUID();
        ids.push(id);
        await trx(
          `INSERT INTO entradas_clientes
          (id, grupo_registro_id, cliente_nombre, monto_entrada, monto_bebida_adicional, metodo_pago,
           baucher_foto, fecha, hora, caja_id, registrado_por, cortesia_estado)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 'pendiente')`,
          [
            id,
            grupoRegistroId,
            input.clienteNombre?.trim() || null,
            costoEntrada,
            metodoPago,
            baucherFoto,
            input.fecha,
            input.hora,
            cajaId,
            input.registradoPor
          ]
        );
      }
    });
  } catch (err) {
    if (baucherFoto)
      await eliminarFotoBaucher(baucherFoto, 'ticket', {
        grupoRegistroId,
        registradoPor: input.registradoPor
      });
    throw err;
  }
  return {
    ids,
    id: ids[0],
    grupo_registro_id: grupoRegistroId,
    caja_id: cajaId,
    monto_entrada: costoEntrada,
    monto_total: montoTotal,
    cantidad_entradas: cantidad
  };
}

export interface EntregaEntradaInput {
  entradaId: string;
  presentacionId: string;
  acompanamientoPresentacionId?: string | null;
  usuarioId: string;
  montoAdicional?: number | null;
  /**
   * Formato con el que sale la cortesía: la botella completa (comportamiento
   * histórico) o un corte. El corte se cobra/valida con el precio del shot de
   * `opciones_venta` y consume ml en vez de una botella entera.
   */
  tipoEntrega?: 'botella' | 'corte';
}

function normalizarMontoAdicional(valor: unknown, respaldo: number): number {
  const derivado = Number.isFinite(respaldo) ? Math.max(0, Math.floor(respaldo)) : 0;
  if (valor === null || valor === undefined || valor === '') return derivado;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return derivado;
  return Math.max(0, Math.floor(numero));
}

export async function entregarEntrada(
  input: EntregaEntradaInput,
  onVenta?: RegistradorVenta
): Promise<ResultadoEntrega> {
  if (!input.entradaId) throw new ValidationError('Indica la entrada a entregar');
  if (!input.presentacionId) throw new ValidationError('Selecciona la bebida a entregar');
  if (!input.usuarioId) throw new ValidationError('No se pudo identificar al usuario');
  if (input.acompanamientoPresentacionId === input.presentacionId)
    throw new ValidationError('La bebida y su acompañamiento deben ser distintos');

  const fechaHora = getNowInBusinessTimezone();
  const tope = await leerTopeCortesia();
  const tareasConfirmadas: Array<() => void | Promise<void>> = [];
  let resultado: ResultadoEntrega | null = null;

  await enUnaUnidad(async unidad => {
    const trx = resolverTransaccion({ id: unidad.id });
    const filas = await trx<
      {
        id: string;
        monto_entrada: number;
        metodo_pago: MetodoPagoEntrada;
        cortesia_estado: EstadoCortesia;
      }[]
    >(
      `SELECT id, monto_entrada, metodo_pago, cortesia_estado
         FROM entradas_clientes WHERE id = ? FOR UPDATE`,
      [input.entradaId]
    );
    const entrada = filas[0];
    if (!entrada) throw new ValidationError('La entrada ya no existe');
    if (entrada.cortesia_estado !== 'pendiente')
      throw new ValidationError('Esta entrada ya fue entregada o anulada');

    const presentaciones = await trx<
      {
        id: string;
        producto_id: string;
        precio_venta: number;
        opciones_venta: unknown;
        estado: number | null;
      }[]
    >(
      `SELECT p.id, p.producto_id, p.precio_venta, p.opciones_venta, pr.estado
         FROM inventario_presentaciones p
         LEFT JOIN productos pr ON pr.id_producto = p.producto_id
        WHERE p.id = ? FOR UPDATE OF p`,
      [input.presentacionId]
    );
    const presentacion = presentaciones[0];
    if (!presentacion) throw new ValidationError('La bebida seleccionada ya no existe');
    if (Number(presentacion.estado) !== 1)
      throw new ValidationError('La bebida seleccionada no está disponible');

    const opciones = parseOpcionesVenta(presentacion.opciones_venta);
    const esCorte = input.tipoEntrega === 'corte';
    const opcionCorte = opciones.find(opcion => opcion?.tipo === 'shot') as
      { precio?: unknown } | undefined;
    const precioCorte = Number(opcionCorte?.precio ?? 0);
    if (esCorte && (!Number.isFinite(precioCorte) || precioCorte <= 0))
      throw new ValidationError('La bebida seleccionada no se vende por corte');

    // La cortesía por corte usa el precio del shot; la botella sigue usando el
    // precio de venta de la presentación, que es el que valida el inventario.
    const precio = esCorte ? Math.floor(precioCorte) : Number(presentacion.precio_venta);
    const montoEntrada = Number(entrada.monto_entrada);
    const umbral = Math.max(tope, montoEntrada);
    const adicionalPorPrecio = precio <= umbral ? 0 : precio - montoEntrada;
    const montoAdicional = normalizarMontoAdicional(input.montoAdicional, adicionalPorPrecio);
    const esCortesia = montoAdicional <= 0;

    const unidades = esCorte ? 0 : unidadesAcompanamiento(opciones);
    if (!esCorte) {
      if (unidades > 0 && !input.acompanamientoPresentacionId)
        throw new ValidationError('Selecciona el acompañamiento incluido en esta bebida');
      if (unidades <= 0 && input.acompanamientoPresentacionId)
        throw new ValidationError('La bebida seleccionada no tiene acompañamiento configurado');
    }

    const caja = await trx<{ id_caja: string }[]>(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1 FOR UPDATE'
    );
    if (!caja.length) throw new ValidationError('Abre una caja antes de entregar la bebida');
    const cajaId = caja[0].id_caja;

    let ventaId: string | null = null;
    if (esCortesia) {
      if (esCorte) {
        await consumirCorteCortesiaBar(
          input.presentacionId,
          input.usuarioId,
          fechaHora,
          { id: unidad.id },
          input.acompanamientoPresentacionId || null
        );
      } else {
        await consumirProductoCortesiaBar(
          input.presentacionId,
          input.usuarioId,
          fechaHora,
          { id: unidad.id },
          umbral,
          input.acompanamientoPresentacionId || null
        );
      }
      const pagos = { efectivo: 0, tarjeta: 0, transferencia: 0 };
      pagos[entrada.metodo_pago] = montoEntrada;
      await registrarMovimientoCobro(cajaId, pagos, { id: unidad.id });
    } else {
      if (!onVenta)
        throw new ValidationError('La bebida con adicional requiere registrar una venta');
      const totalVenta = montoEntrada + montoAdicional;
      const detalle: Record<string, unknown> = {
        producto_id: presentacion.producto_id,
        presentacion_id: input.presentacionId,
        tipo_venta: esCorte ? 'shot' : 'botella',
        precio,
        comision: 0,
        cantidad: 1,
        sub_total: totalVenta
      };
      if (esCorte && input.acompanamientoPresentacionId)
        detalle.acompanamiento_corto = {
          presentacion_id: input.acompanamientoPresentacionId,
          unidades: 1
        };
      if (!esCorte && unidades > 0 && input.acompanamientoPresentacionId)
        detalle.acompanamiento_botella = {
          presentacion_id: input.acompanamientoPresentacionId,
          unidades
        };
      const creada = await onVenta(
        {
          totalVenta,
          metodoPago: entrada.metodo_pago,
          usuarioId: input.usuarioId,
          entradaId: entrada.id,
          detalles: [detalle]
        },
        { id: unidad.id },
        tarea => tareasConfirmadas.push(tarea)
      );
      ventaId = creada?.ventaId ?? null;
    }

    await trx(
      `UPDATE entradas_clientes
          SET cortesia_estado = 'entregada',
              cortesia_entregada_por = ?,
              cortesia_entregada_at = ?,
              cover_presentacion_id = ?,
              bebida_acompanamiento_presentacion_id = ?,
              monto_bebida_adicional = ?
        WHERE id = ?`,
      [
        input.usuarioId,
        fechaHora,
        input.presentacionId,
        input.acompanamientoPresentacionId || null,
        montoAdicional,
        entrada.id
      ]
    );
    if (esCortesia) {
      await trx(
        `INSERT INTO entradas_clientes_productos
          (entrada_id, presentacion_id, cantidad, acompanamiento_presentacion_id)
         VALUES (?, ?, 1, ?) ON CONFLICT DO NOTHING`,
        [entrada.id, input.presentacionId, input.acompanamientoPresentacionId || null]
      );
    }

    resultado = {
      entradaId: entrada.id,
      tipo: esCortesia ? 'cortesia' : 'upgrade',
      presentacionId: input.presentacionId,
      precio,
      montoEntrada,
      montoCobrarBarra: montoAdicional,
      ventaId,
      cajaId
    };
  });
  await ejecutarEfectosConfirmados(tareasConfirmadas);
  return resultado as unknown as ResultadoEntrega;
}

export async function anularEntrada(input: {
  entradaId: string;
  usuarioId: string;
}): Promise<{ entradaId: string; monto: number }> {
  if (!input.entradaId) throw new ValidationError('Indica la entrada a anular');
  if (!input.usuarioId) throw new ValidationError('No se pudo identificar al usuario');
  const fechaHora = getNowInBusinessTimezone();
  let monto = 0;
  await enUnaUnidad(async unidad => {
    const trx = resolverTransaccion({ id: unidad.id });
    const filas = await trx<
      {
        id: string;
        monto_entrada: number;
        metodo_pago: MetodoPagoEntrada;
        cortesia_estado: EstadoCortesia;
      }[]
    >(
      `SELECT id, monto_entrada, metodo_pago, cortesia_estado
         FROM entradas_clientes WHERE id = ? FOR UPDATE`,
      [input.entradaId]
    );
    const entrada = filas[0];
    if (!entrada) throw new ValidationError('La entrada ya no existe');
    if (entrada.cortesia_estado !== 'pendiente')
      throw new ValidationError('Esta entrada ya fue entregada o anulada');
    const caja = await trx<{ id_caja: string }[]>(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1 FOR UPDATE'
    );
    if (!caja.length) throw new ValidationError('Abre una caja antes de anular la entrada');
    monto = Number(entrada.monto_entrada);
    const pagos = { efectivo: 0, tarjeta: 0, transferencia: 0 };
    pagos[entrada.metodo_pago] = monto;
    if (monto > 0) await registrarMovimientoCobro(caja[0].id_caja, pagos, { id: unidad.id });
    await trx(
      `UPDATE entradas_clientes
          SET cortesia_estado = 'anulada', cortesia_entregada_por = ?, cortesia_entregada_at = ?
        WHERE id = ?`,
      [input.usuarioId, fechaHora, entrada.id]
    );
  });
  return { entradaId: input.entradaId, monto };
}

export async function postearPendientesDeCaja(input: {
  cajaId: string;
  usuarioId: string;
}): Promise<{ entradas: number; total: number }> {
  if (!input.cajaId) throw new ValidationError('Indica la caja a cerrar');
  const fechaHora = getNowInBusinessTimezone();
  let entradas = 0;
  let total = 0;
  await enUnaUnidad(async unidad => {
    const trx = resolverTransaccion({ id: unidad.id });
    const filas = await trx<
      { id: string; monto_entrada: number; metodo_pago: MetodoPagoEntrada }[]
    >(
      `SELECT id, monto_entrada, metodo_pago
         FROM entradas_clientes
        WHERE caja_id = ? AND cortesia_estado = 'pendiente'
        FOR UPDATE`,
      [input.cajaId]
    );
    if (!filas.length) return;
    const pagos = { efectivo: 0, tarjeta: 0, transferencia: 0 };
    for (const fila of filas) {
      const monto = Number(fila.monto_entrada);
      total += monto;
      if (METODOS.includes(fila.metodo_pago)) pagos[fila.metodo_pago] += monto;
    }
    if (total > 0) await registrarMovimientoCobro(input.cajaId, pagos, { id: unidad.id });
    for (const fila of filas) {
      await trx(
        `UPDATE entradas_clientes
            SET cortesia_estado = 'anulada', cortesia_entregada_por = ?, cortesia_entregada_at = ?
          WHERE id = ?`,
        [input.usuarioId, fechaHora, fila.id]
      );
    }
    entradas = filas.length;
  });
  return { entradas, total };
}
