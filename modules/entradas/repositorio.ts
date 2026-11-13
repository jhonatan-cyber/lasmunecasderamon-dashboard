import { generateUUID, query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { ValidationError } from '@/lib/errors/errors';
import { consumirCorteCoverBar, consumirProductoCoverBar } from '@/modules/inventario';
import { enUnaUnidad } from '@/lib/transaction/contract';
import { resolverTransaccion } from '@/lib/transaction/infrastructure';
import { registrarMovimientoCobro } from '@/modules/caja';
import { ejecutarEfectosConfirmados } from '@/lib/transaction/effects';
import { defaultDeClave } from '@/modules/configuracion/contracts';
import { esBaucherDataUrlValido } from '@/lib/business/baucher';
import { eliminarFotoBaucher, guardarFotoBaucher } from '@/lib/utils/image-utils';
import {
  normalizarAcompanamientoBotella,
  type AcompanamientoBotellaItem
} from '@/lib/sales/acompanamientoBotella';

export type MetodoPagoEntrada = 'efectivo' | 'tarjeta' | 'transferencia';
export type EstadoCover = 'pendiente' | 'entregada' | 'anulada';
/**
 * Quién cerró una entrada anulada: a mano (se devuelve el dinero, no entra a la
 * caja) o el barrido del cierre del turno (la caja postea ese dinero).
 */
export type AnulacionOrigen = 'manual' | 'cierre';

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
  productos_cover: string | null;
  cantidad_productos_cover: number;
  cliente_nombre: string | null;
  monto_entrada: number;
  monto_bebida_adicional: number;
  metodo_pago: MetodoPagoEntrada;
  baucher_foto: string | null;
  caja_id: string | null;
  venta_id: string | null;
  bebida_cover_presentacion_id: string | null;
  bebida_cover: string | null;
  bebida_acompanamiento_presentacion_id: string | null;
  acompanamiento_bebida: string | null;
  fecha: string;
  hora: string;
  registrado_por_nombre: string;
  cover_estado: EstadoCover;
  /** `NULL` mientras la entrada no está anulada. */
  anulacion_origen: AnulacionOrigen | null;
  cover_entregada_at: string | null;
  cover_entregada_por_nombre: string | null;
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
  tipo: 'cover' | 'upgrade';
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

/**
 * La app ya instalada lee los nombres anteriores (`cortesia_*`). Se mantienen
 * como alias de sólo lectura en la respuesta hasta que todas las versiones
 * móviles estén actualizadas.
 */
function conAliasLegacy(fila: EntradaCliente) {
  return {
    ...fila,
    cortesia_estado: fila.cover_estado,
    cortesia_entregada_at: fila.cover_entregada_at,
    cortesia_entregada_por_nombre: fila.cover_entregada_por_nombre,
    bebida_cortesia_presentacion_id: fila.bebida_cover_presentacion_id,
    bebida_cortesia: fila.bebida_cover,
    productos_cortesia: fila.productos_cover,
    cantidad_productos_cortesia: fila.cantidad_productos_cover
  };
}

export async function listarEntradas(fecha?: string): Promise<EntradaCliente[]> {
  const fechaFiltro = fecha || getNowInBusinessTimezone().slice(0, 10);
  const filas = await query<EntradaCliente[]>(
    `SELECT e.id, e.grupo_registro_id, e.cliente_nombre, e.monto_entrada, e.monto_bebida_adicional, e.metodo_pago,
            e.baucher_foto,
            e.caja_id,
            v.id_venta AS venta_id,
            e.cover_presentacion_id AS bebida_cover_presentacion_id,
            CASE WHEN e.cover_presentacion_id IS NULL THEN NULL
                 ELSE pr.nombre || ' · ' || p.nombre END AS bebida_cover,
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
            ) AS productos_cover,
            COALESCE((SELECT SUM(d.cantidad) FROM entradas_clientes_productos d WHERE d.entrada_id = e.id),
                     CASE WHEN e.cover_presentacion_id IS NULL THEN 0 ELSE 1 END) AS cantidad_productos_cover,
            e.fecha, to_char(e.hora, 'HH24:MI') AS hora,
            u.nombre || ' ' || u.apellido AS registrado_por_nombre,
            e.cover_estado,
            e.anulacion_origen,
            to_char(e.cover_entregada_at, 'YYYY-MM-DD HH24:MI') AS cover_entregada_at,
            CASE WHEN e.cover_entregada_por IS NULL THEN NULL
                 ELSE eu.nombre || ' ' || eu.apellido END AS cover_entregada_por_nombre
       FROM entradas_clientes e
       JOIN usuarios u ON u.id_usuario = e.registrado_por
       LEFT JOIN usuarios eu ON eu.id_usuario = e.cover_entregada_por
       LEFT JOIN ventas v ON v.entrada_id = e.id
       LEFT JOIN inventario_presentaciones p ON p.id = e.cover_presentacion_id
       LEFT JOIN productos pr ON pr.id_producto = p.producto_id
       LEFT JOIN inventario_presentaciones pa ON pa.id = e.bebida_acompanamiento_presentacion_id
       LEFT JOIN productos pra ON pra.id_producto = pa.producto_id
      WHERE e.fecha = ? ORDER BY e.hora DESC, e.fecha_crea DESC`,
    [fechaFiltro]
  );
  return filas.map(conAliasLegacy);
}

export async function listarPendientes(fecha?: string): Promise<EntradaPendiente[]> {
  const fechaFiltro = fecha || getNowInBusinessTimezone().slice(0, 10);
  return query<EntradaPendiente[]>(
    `SELECT e.id, e.grupo_registro_id, e.cliente_nombre, e.monto_entrada, e.metodo_pago,
            e.fecha, to_char(e.hora, 'HH24:MI') AS hora, e.caja_id,
            u.nombre || ' ' || u.apellido AS registrado_por_nombre
       FROM entradas_clientes e
       JOIN usuarios u ON u.id_usuario = e.registrado_por
      WHERE e.cover_estado = 'pendiente' AND e.fecha = ?
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
           baucher_foto, fecha, hora, caja_id, registrado_por, cover_estado)
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
  acompanamientos?: AcompanamientoBotellaItem[] | null;
  usuarioId: string;
  montoAdicional?: number | null;
  tipoEntrega?: 'botella' | 'corte';
}

export interface UnidadCover {
  presentacion_id: string;
  tipo_entrega: 'botella' | 'corte';
  acompanamientos?: AcompanamientoBotellaItem[] | null;
}

export interface EntregaGrupoInput {
  entradaIds: string[];
  unidades: UnidadCover[];
  montoAdicional: number;
  usuarioId: string;
  solicitudId?: string;
}

export async function entregarGrupoEntradas(input: EntregaGrupoInput, onVenta?: RegistradorVenta) {
  if (!input.usuarioId || !input.entradaIds.length || input.entradaIds.length > 100)
    throw new ValidationError('Selecciona las entradas a entregar');
  const ids = [...new Set(input.entradaIds)].sort();
  if (ids.length !== input.entradaIds.length || ids.some(id => !id))
    throw new ValidationError('Las entradas seleccionadas no pueden repetirse');
  if (!input.unidades.length || input.unidades.length > 500)
    throw new ValidationError('Selecciona entre 1 y 500 productos');
  if (
    !Number.isSafeInteger(input.montoAdicional) ||
    input.montoAdicional < 0 ||
    input.montoAdicional > 2147483647
  )
    throw new ValidationError('El aporte adicional debe ser un monto entero no negativo');
  const fecha = getNowInBusinessTimezone();
  const tareas: Array<() => void | Promise<void>> = [];
  const resultado = await enUnaUnidad(async unidad => {
    const contexto = { id: unidad.id };
    const trx = resolverTransaccion(contexto);
    if (input.solicitudId) {
      const solicitudes = await trx<{ estado: string }[]>(
        'SELECT estado FROM solicitudes_entrega_covers WHERE id = ? FOR UPDATE',
        [input.solicitudId]
      );
      if (solicitudes[0]?.estado !== 'pendiente')
        throw new ValidationError('La solicitud ya fue respondida');
    }
    const entradas = await trx<
      Array<{
        id: string;
        grupo_registro_id: string | null;
        monto_entrada: number;
        metodo_pago: MetodoPagoEntrada;
        cover_estado: EstadoCover;
      }>
    >(
      `SELECT id, grupo_registro_id, monto_entrada, metodo_pago, cover_estado
         FROM entradas_clientes WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY id FOR UPDATE`,
      ids
    );
    if (
      entradas.length !== ids.length ||
      entradas.some(entrada => entrada.cover_estado !== 'pendiente')
    )
      throw new ValidationError('Alguna entrada ya fue entregada, anulada o no existe');
    const primera = entradas[0];
    if (
      entradas.length > 1 &&
      (!primera.grupo_registro_id ||
        entradas.some(
          entrada =>
            entrada.grupo_registro_id !== primera.grupo_registro_id ||
            entrada.metodo_pago !== primera.metodo_pago
        ))
    )
      throw new ValidationError('Selecciona entradas de una misma compra');
    const montoEntrada = entradas.reduce(
      (suma, entrada) => suma + Number(entrada.monto_entrada),
      0
    );
    const presupuesto = montoEntrada + input.montoAdicional;
    if (!Number.isSafeInteger(presupuesto) || presupuesto > 2147483647)
      throw new ValidationError('El presupuesto supera el monto permitido');
    const presentacionIds = [...new Set(input.unidades.map(item => item.presentacion_id))].sort();
    const presentaciones = await trx<
      Array<{
        id: string;
        producto_id: string;
        precio_venta: number;
        opciones_venta: unknown;
        estado: number | null;
      }>
    >(
      `SELECT p.id, p.producto_id, p.precio_venta, p.opciones_venta, pr.estado
         FROM inventario_presentaciones p JOIN productos pr ON pr.id_producto = p.producto_id
        WHERE p.id IN (${presentacionIds.map(() => '?').join(',')}) ORDER BY p.id FOR UPDATE OF p`,
      presentacionIds
    );
    const seleccion = input.unidades.map(item => {
      const presentacion = presentaciones.find(fila => fila.id === item.presentacion_id);
      if (!presentacion || Number(presentacion.estado) !== 1)
        throw new ValidationError('La bebida seleccionada no está disponible');
      const opciones = parseOpcionesVenta(presentacion.opciones_venta);
      const botella = opciones.find(opcion => opcion.tipo === 'botella');
      if (botella?.cover_habilitado === false)
        throw new ValidationError('La bebida seleccionada no está habilitada como cover');
      const esCorte = item.tipo_entrega === 'corte';
      const shot = opciones.find(opcion => opcion.tipo === 'shot');
      const precioSin = Number(botella?.precio_sin_anfitriona ?? 0);
      const precio = esCorte
        ? Number(shot?.precio ?? 0)
        : precioSin > 0
          ? precioSin
          : Number(presentacion.precio_venta);
      if (!Number.isSafeInteger(precio) || precio <= 0)
        throw new ValidationError('El precio de la bebida no está configurado');
      const reparto = normalizarAcompanamientoBotella(item.acompanamientos);
      const total = reparto.reduce((suma, sabor) => suma + sabor.unidades, 0);
      if (
        new Set(reparto.map(sabor => sabor.presentacion_id)).size !== reparto.length ||
        reparto.some(sabor => sabor.presentacion_id === item.presentacion_id)
      )
        throw new ValidationError('Selecciona sabores distintos de la bebida principal');
      if (esCorte ? total > 1 : total !== unidadesAcompanamiento(opciones))
        throw new ValidationError(
          'El acompañamiento no coincide con la configuración de la bebida'
        );
      return { item, presentacion, precio, reparto, esCorte, precioSin };
    });
    const precioProductos = seleccion.reduce((suma, item) => suma + item.precio, 0);
    if (precioProductos > presupuesto)
      throw new ValidationError(
        'Los productos superan el presupuesto de entradas más el aporte adicional'
      );
    const cajas = await trx<{ id_caja: string }[]>(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1 FOR UPDATE'
    );
    if (!cajas.length) throw new ValidationError('Abre una caja antes de entregar las bebidas');
    let ventaId: string | null = null;
    if (input.montoAdicional > 0) {
      if (!onVenta) throw new ValidationError('La entrega con aporte requiere registrar una venta');
      const detalles = seleccion.map((item, indice) => ({
        producto_id: item.presentacion.producto_id,
        presentacion_id: item.item.presentacion_id,
        tipo_venta: item.esCorte ? 'shot' : 'botella',
        ...(item.precioSin > 0 && !item.esCorte ? { botella_anfitriona: false } : {}),
        precio: item.precio,
        comision: 0,
        cantidad: 1,
        sub_total: item.precio + (indice === 0 ? presupuesto - precioProductos : 0),
        ...(item.esCorte && item.reparto.length
          ? {
              acompanamiento_corto: {
                presentacion_id: item.reparto[0].presentacion_id,
                unidades: 1
              }
            }
          : {}),
        ...(!item.esCorte && item.reparto.length ? { acompanamiento_botella: item.reparto } : {})
      }));
      const venta = await onVenta(
        {
          totalVenta: presupuesto,
          metodoPago: primera.metodo_pago,
          usuarioId: input.usuarioId,
          entradaId: primera.id,
          detalles
        },
        contexto,
        tarea => tareas.push(tarea)
      );
      ventaId = venta?.ventaId ?? null;
    } else {
      for (const item of seleccion) {
        if (item.esCorte) {
          await consumirCorteCoverBar(
            item.item.presentacion_id,
            input.usuarioId,
            fecha,
            contexto,
            item.reparto
          );
        } else {
          await consumirProductoCoverBar(
            item.item.presentacion_id,
            input.usuarioId,
            fecha,
            contexto,
            Math.max(item.precio, Number(item.presentacion.precio_venta)),
            item.reparto
          );
        }
      }
      const pagos = { efectivo: 0, tarjeta: 0, transferencia: 0 };
      pagos[primera.metodo_pago] = montoEntrada;
      await registrarMovimientoCobro(cajas[0].id_caja, pagos, contexto);
    }
    for (const [indice, entrada] of entradas.entries()) {
      const producto = seleccion[indice];
      const aporte =
        Math.floor(input.montoAdicional / entradas.length) +
        (indice < input.montoAdicional % entradas.length ? 1 : 0);
      await trx(
        `UPDATE entradas_clientes SET cover_estado = 'entregada', cover_entregada_por = ?,
          cover_entregada_at = ?, cover_presentacion_id = ?, bebida_acompanamiento_presentacion_id = ?,
          monto_bebida_adicional = ?, acompanamientos = ? WHERE id = ?`,
        [
          input.usuarioId,
          fecha,
          producto?.item.presentacion_id ?? null,
          producto?.reparto[0]?.presentacion_id ?? null,
          aporte,
          producto?.reparto.length ? JSON.stringify(producto.reparto) : null,
          entrada.id
        ]
      );
    }
    const productos = new Map<
      string,
      {
        entradaId: string;
        presentacionId: string;
        cantidad: number;
        reparto: AcompanamientoBotellaItem[];
      }
    >();
    for (const [indice, item] of seleccion.entries()) {
      const entradaId = entradas[indice % entradas.length].id;
      const clave = `${entradaId}:${item.item.presentacion_id}`;
      const agregado = productos.get(clave) ?? {
        entradaId,
        presentacionId: item.item.presentacion_id,
        cantidad: 0,
        reparto: []
      };
      agregado.cantidad += 1;
      for (const sabor of item.reparto) {
        const existente = agregado.reparto.find(
          fila => fila.presentacion_id === sabor.presentacion_id
        );
        if (existente) existente.unidades += sabor.unidades;
        else agregado.reparto.push({ ...sabor });
      }
      productos.set(clave, agregado);
    }
    for (const producto of productos.values()) {
      await trx(
        `INSERT INTO entradas_clientes_productos
          (entrada_id, presentacion_id, cantidad, acompanamiento_presentacion_id, acompanamientos)
          VALUES (?, ?, ?, ?, ?)`,
        [
          producto.entradaId,
          producto.presentacionId,
          producto.cantidad,
          producto.reparto[0]?.presentacion_id ?? null,
          producto.reparto.length ? JSON.stringify(producto.reparto) : null
        ]
      );
    }
    if (input.solicitudId) {
      await trx(
        `UPDATE solicitudes_entrega_covers SET estado = 'aprobada', autorizado_por = ?, fecha_respuesta = ? WHERE id = ?`,
        [input.usuarioId, fecha, input.solicitudId]
      );
    }
    return {
      entradas: entradas.length,
      productos: seleccion.length,
      montoEntrada,
      montoCobrarBarra: input.montoAdicional,
      presupuesto,
      ventaId,
      cajaId: cajas[0].id_caja
    };
  });
  await ejecutarEfectosConfirmados(tareas);
  return resultado;
}

function normalizarMontoAdicional(valor: unknown, respaldo: number): number {
  const derivado = Number.isFinite(respaldo) ? Math.max(0, Math.floor(respaldo)) : 0;
  if (valor === null || valor === undefined || valor === '') return derivado;
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero < 0 || numero > 2147483647)
    throw new ValidationError('Indica un monto adicional entero no negativo');
  if (numero < derivado)
    throw new ValidationError('El aporte adicional no cubre el precio de la bebida');
  return numero;
}

export async function entregarEntrada(
  input: EntregaEntradaInput,
  onVenta?: RegistradorVenta
): Promise<ResultadoEntrega> {
  if (!input.entradaId) throw new ValidationError('Indica la entrada a entregar');
  if (!input.presentacionId) throw new ValidationError('Selecciona la bebida a entregar');
  if (!input.usuarioId) throw new ValidationError('No se pudo identificar al usuario');

  const fechaHora = getNowInBusinessTimezone();
  const tareasConfirmadas: Array<() => void | Promise<void>> = [];
  let resultado: ResultadoEntrega | null = null;

  await enUnaUnidad(async unidad => {
    const trx = resolverTransaccion({ id: unidad.id });
    const filas = await trx<
      {
        id: string;
        monto_entrada: number;
        metodo_pago: MetodoPagoEntrada;
        cover_estado: EstadoCover;
      }[]
    >(
      `SELECT id, monto_entrada, metodo_pago, cover_estado
         FROM entradas_clientes WHERE id = ? FOR UPDATE`,
      [input.entradaId]
    );
    const entrada = filas[0];
    if (!entrada) throw new ValidationError('La entrada ya no existe');
    if (entrada.cover_estado !== 'pendiente')
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

    const botella = opciones.find(opcion => opcion.tipo === 'botella');
    if (botella?.cover_habilitado === false)
      throw new ValidationError('La bebida seleccionada no está habilitada como cover');
    const precioSin = Number(botella?.precio_sin_anfitriona ?? 0);
    const precio = esCorte
      ? precioCorte
      : precioSin > 0
        ? precioSin
        : Number(presentacion.precio_venta);
    if (!Number.isSafeInteger(precio) || precio <= 0)
      throw new ValidationError('El precio de la bebida no está configurado');
    const montoEntrada = Number(entrada.monto_entrada);
    const adicionalPorPrecio = Math.max(0, precio - montoEntrada);
    const montoAdicional = normalizarMontoAdicional(input.montoAdicional, adicionalPorPrecio);
    const esCover = montoAdicional <= 0;
    const unidades = esCorte ? 0 : unidadesAcompanamiento(opciones);
    const reparto = input.acompanamientos?.length
      ? normalizarAcompanamientoBotella(input.acompanamientos)
      : input.acompanamientoPresentacionId
        ? [
            {
              presentacion_id: input.acompanamientoPresentacionId,
              unidades: esCorte ? 1 : Math.max(1, unidades)
            }
          ]
        : [];
    const idsReparto = reparto.map(sabor => sabor.presentacion_id);
    const totalReparto = reparto.reduce((suma, sabor) => suma + sabor.unidades, 0);
    if (new Set(idsReparto).size !== idsReparto.length)
      throw new ValidationError('Cada sabor del acompañamiento se elige una sola vez');
    if (idsReparto.includes(input.presentacionId))
      throw new ValidationError('La bebida y su acompañamiento deben ser distintos');
    if (esCorte) {
      if (totalReparto > 1)
        throw new ValidationError('El corte lleva una sola bebida de acompañamiento');
    } else {
      if (unidades > 0 && reparto.length === 0)
        throw new ValidationError('Selecciona el acompañamiento incluido en esta bebida');
      if (unidades > 0 && totalReparto !== unidades)
        throw new ValidationError('Reparte el acompañamiento entre los sabores incluidos');
      if (unidades <= 0 && reparto.length > 0)
        throw new ValidationError('La bebida seleccionada no tiene acompañamiento configurado');
    }
    const acompanamientoJson = reparto.length ? JSON.stringify(reparto) : null;
    const acompanamientoPrincipalId = reparto[0]?.presentacion_id ?? null;

    const caja = await trx<{ id_caja: string }[]>(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1 FOR UPDATE'
    );
    if (!caja.length) throw new ValidationError('Abre una caja antes de entregar la bebida');
    const cajaId = caja[0].id_caja;

    let ventaId: string | null = null;
    if (esCover) {
      if (esCorte) {
        await consumirCorteCoverBar(
          input.presentacionId,
          input.usuarioId,
          fechaHora,
          { id: unidad.id },
          reparto.length ? reparto : null
        );
      } else {
        await consumirProductoCoverBar(
          input.presentacionId,
          input.usuarioId,
          fechaHora,
          { id: unidad.id },
          Math.max(precio, Number(presentacion.precio_venta)),
          reparto.length ? reparto : null
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
        ...(precioSin > 0 && !esCorte ? { botella_anfitriona: false } : {}),
        precio,
        comision: 0,
        cantidad: 1,
        sub_total: totalVenta
      };
      if (esCorte && reparto.length > 0)
        detalle.acompanamiento_corto = {
          presentacion_id: reparto[0].presentacion_id,
          unidades: 1
        };
      if (!esCorte && unidades > 0 && reparto.length > 0) detalle.acompanamiento_botella = reparto;
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
          SET cover_estado = 'entregada',
              cover_entregada_por = ?,
              cover_entregada_at = ?,
              cover_presentacion_id = ?,
              bebida_acompanamiento_presentacion_id = ?,
              monto_bebida_adicional = ?,
              acompanamientos = ?
        WHERE id = ?`,
      [
        input.usuarioId,
        fechaHora,
        input.presentacionId,
        acompanamientoPrincipalId,
        montoAdicional,
        acompanamientoJson,
        entrada.id
      ]
    );
    await trx(
      `INSERT INTO entradas_clientes_productos
        (entrada_id, presentacion_id, cantidad, acompanamiento_presentacion_id, acompanamientos)
       VALUES (?, ?, 1, ?, ?) ON CONFLICT DO NOTHING`,
      [entrada.id, input.presentacionId, acompanamientoPrincipalId, acompanamientoJson]
    );

    resultado = {
      entradaId: entrada.id,
      tipo: esCover ? 'cover' : 'upgrade',
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

/**
 * Anula una entrada que nunca se sirvió y devuelve su dinero.
 *
 * La puerta cobra la entrada pero no la postea en la caja: ese dinero entra al
 * libro recién al servirla (`entregarEntrada`) o al cerrar el turno
 * (`postearPendientesDeCaja`). Por eso anular no registra ningún movimiento:
 * el importe se devuelve al cliente y la fila queda cerrada sin tocar caja ni stock.
 */
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
        cover_estado: EstadoCover;
      }[]
    >(
      `SELECT id, monto_entrada, cover_estado
         FROM entradas_clientes WHERE id = ? FOR UPDATE`,
      [input.entradaId]
    );
    const entrada = filas[0];
    if (!entrada) throw new ValidationError('La entrada ya no existe');
    if (entrada.cover_estado !== 'pendiente')
      throw new ValidationError('Esta entrada ya fue entregada o anulada');
    monto = Number(entrada.monto_entrada);
    await trx(
      `UPDATE entradas_clientes
          SET cover_estado = 'anulada', cover_entregada_por = ?, cover_entregada_at = ?,
              anulacion_origen = 'manual'
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
        WHERE caja_id = ? AND cover_estado = 'pendiente'
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
            SET cover_estado = 'anulada', cover_entregada_por = ?, cover_entregada_at = ?,
                anulacion_origen = 'cierre'
          WHERE id = ?`,
        [input.usuarioId, fechaHora, fila.id]
      );
    }
    entradas = filas.length;
  });
  return { entradas, total };
}
