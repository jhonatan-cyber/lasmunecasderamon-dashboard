import { generateUUID, query } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { ValidationError } from '@/lib/errors/errors';
import { consumirProductoCortesiaBar } from '@/modules/inventario';
import { enUnaUnidad } from '@/lib/transaction/contract';
import { resolverTransaccion } from '@/lib/transaction/infrastructure';
import { registrarMovimientoCobro } from '@/modules/caja';
import { ejecutarEfectosConfirmados } from '@/lib/transaction/effects';
import { defaultDeClave } from '@/modules/configuracion/contracts';

/**
 * Entradas de clientes con solicitud de cortesía diferida.
 *
 * El garzón cobra en la puerta y NO se postea nada: el precio de la entrada
 * pertenece a la cubeta que el cliente decide en la barra. Si toma la cortesía
 * el monto se postea como entrada (`registrarMovimientoCobro`); si pide una
 * bebida más cara se registra una venta por el precio de lista de la bebida y el
 * cliente completa la diferencia en la barra. Cada peso entra una sola vez.
 */

export type MetodoPagoEntrada = 'efectivo' | 'tarjeta' | 'transferencia';
export type EstadoCortesia = 'pendiente' | 'entregada' | 'anulada';

const METODOS: readonly MetodoPagoEntrada[] = ['efectivo', 'tarjeta', 'transferencia'];

/** Plan de la venta del adicional: el adaptador HTTP la registra con SaleService. */
export interface PlanVentaEntrada {
  totalVenta: number;
  metodoPago: MetodoPagoEntrada;
  usuarioId: string;
  entradaId: string;
  detalles: Record<string, unknown>[];
}

/**
 * El adaptador HTTP registra la venta y devuelve su id, para dejarlo en la
 * fila de la entrada (trazabilidad entrada ↔ venta).
 */
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
  /** Precio de lista de la bebida entregada. */
  precio: number;
  /** Lo que el cliente ya pagó en la puerta. */
  montoEntrada: number;
  /** Lo que el cliente entrega en la barra (0 en la cortesía). */
  montoCobrarBarra: number;
  ventaId: string | null;
  cajaId: string;
}

/** Lee una clave numérica de `configuraciones` (tabla del módulo Configuración, sólo lectura). */
async function leerConfiguracion(clave: string, respaldo: number): Promise<number> {
  const filas = await query<{ valor: string }[]>(
    'SELECT valor FROM configuraciones WHERE clave = ? LIMIT 1',
    [clave]
  );
  const guardado = Number(filas[0]?.valor);
  const valor = Number.isFinite(guardado) ? guardado : (defaultDeClave<number>(clave) ?? respaldo);
  return Number.isFinite(valor) ? Math.floor(valor) : respaldo;
}

/** Precio de la entrada por persona (lo que cobra el garzón en la puerta). */
async function leerCostoEntrada(): Promise<number> {
  const valor = await leerConfiguracion('costo_entrada', 0);
  if (valor <= 0) throw new ValidationError('El costo de entrada no está configurado');
  return valor;
}

/**
 * Tope de la bebida de cortesía: el campo "Covers de entradas" de
 * Configuraciones → Bar y comisiones, la misma clave que usa
 * `consumirProductoCortesia` cuando no recibe un máximo explícito.
 */
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

/** Cola de la barra: una fila por persona que todavía no recibió su bebida. */
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

export interface RegistroEntradaInput {
  clienteNombre?: string;
  /** Si viene, se valida contra la configuración; el precio lo fija el servidor. */
  montoEntrada?: number;
  cantidadEntradas: number;
  metodoPago: string;
  fecha: string;
  hora: string;
  registradoPor: string;
}

/**
 * Registro en la puerta: sólo cobra la entrada y deja la cortesía pendiente.
 *
 * No consume stock, no crea venta y no mueve la caja: el dinero entra a la caja
 * recién cuando el cliente se sirve en la barra (cortesía) o cuando su bebida se
 * registra como venta (adicional).
 */
export async function registrarEntrada(input: RegistroEntradaInput) {
  if (!input.registradoPor) throw new ValidationError('No se pudo identificar al usuario');
  const cantidad = Number(input.cantidadEntradas);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100)
    throw new ValidationError('Indica entre 1 y 100 entradas para registrar');
  const metodoPago = validarMetodoPago(input.metodoPago);
  validarFechaHora(input.fecha, input.hora);
  // El precio lo fija la configuración, no el cliente (§5: el servidor valida el
  // dinero). La UI manda el total del grupo; cada fila guarda su parte.
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
  const ids: string[] = [];
  let cajaId = '';
  await enUnaUnidad(async unidad => {
    const trx = resolverTransaccion({ id: unidad.id });
    // Misma regla que colaciones, ventas y reportes: la caja abierta más reciente
    // es la del turno actual. Se guarda para saber dónde se cobró la entrada.
    const caja = await trx<{ id_caja: string }[]>(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1 FOR UPDATE'
    );
    if (!caja.length) throw new ValidationError('Abre una caja antes de registrar entradas');
    cajaId = caja[0].id_caja;
    for (let indice = 0; indice < cantidad; indice += 1) {
      const id = generateUUID();
      ids.push(id);
      // `fecha_crea` la pone el servidor (DEFAULT CURRENT_TIMESTAMP): es el
      // registro de auditoría, no la hora de negocio que elige el cajero.
      await trx(
        `INSERT INTO entradas_clientes
          (id, grupo_registro_id, cliente_nombre, monto_entrada, monto_bebida_adicional, metodo_pago,
           fecha, hora, caja_id, registrado_por, cortesia_estado)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'pendiente')`,
        [
          id,
          grupoRegistroId,
          input.clienteNombre?.trim() || null,
          costoEntrada,
          metodoPago,
          input.fecha,
          input.hora,
          cajaId,
          input.registradoPor
        ]
      );
    }
  });
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
}

/**
 * Entrega en la barra: cortesía o adicional, según el precio de la bebida.
 *
 * Umbral = `max(tope, monto_entrada)`. Con la configuración prevista
 * (tope = costo de entrada) equivale a "la bebida cuesta más que la entrada".
 * El `max` evita una diferencia negativa si alguien configura un tope menor que
 * la entrada: ninguna bebida más barata que lo ya pagado puede cobrarse extra.
 */
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
    // El candado de la fila es el que impide que dos baristas entreguen la misma
    // entrada (y que se cobre dos veces).
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

    const precio = Number(presentacion.precio_venta);
    const montoEntrada = Number(entrada.monto_entrada);
    const umbral = Math.max(tope, montoEntrada);
    const esCortesia = precio <= umbral;

    const opciones = parseOpcionesVenta(presentacion.opciones_venta);
    const unidades = unidadesAcompanamiento(opciones);
    if (unidades > 0 && !input.acompanamientoPresentacionId)
      throw new ValidationError('Selecciona el acompañamiento incluido en esta bebida');
    if (unidades <= 0 && input.acompanamientoPresentacionId)
      throw new ValidationError('La bebida seleccionada no tiene acompañamiento configurado');

    const caja = await trx<{ id_caja: string }[]>(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1 FOR UPDATE'
    );
    if (!caja.length) throw new ValidationError('Abre una caja antes de entregar la bebida');
    const cajaId = caja[0].id_caja;

    let ventaId: string | null = null;
    if (esCortesia) {
      // Movimiento de inventario tipo `cortesia` + el precio de la entrada a la
      // caja: la cubeta "entradas". El tope va explícito para que el motor de
      // inventario valide el mismo precio que decidió la rama.
      await consumirProductoCortesiaBar(
        input.presentacionId,
        input.usuarioId,
        fechaHora,
        { id: unidad.id },
        umbral,
        input.acompanamientoPresentacionId || null
      );
      const pagos = { efectivo: 0, tarjeta: 0, transferencia: 0 };
      pagos[entrada.metodo_pago] = montoEntrada;
      await registrarMovimientoCobro(cajaId, pagos, { id: unidad.id });
    } else {
      // La venta lleva el precio de lista completo de la bebida: el precio de la
      // entrada ya se cobró en la puerta y se acredita a esta bebida, así que el
      // total posteado (entradas + ventas) es lo que pagaron los clientes.
      if (!onVenta)
        throw new ValidationError('La bebida con adicional requiere registrar una venta');
      const detalle: Record<string, unknown> = {
        producto_id: presentacion.producto_id,
        presentacion_id: input.presentacionId,
        tipo_venta: 'botella',
        precio,
        comision: 0,
        cantidad: 1,
        sub_total: precio
      };
      if (unidades > 0 && input.acompanamientoPresentacionId)
        detalle.acompanamiento_botella = {
          presentacion_id: input.acompanamientoPresentacionId,
          unidades
        };
      const creada = await onVenta(
        {
          totalVenta: precio,
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
        esCortesia ? 0 : precio - montoEntrada,
        entrada.id
      ]
    );
    if (esCortesia) {
      // Detalle de lo entregado como cortesía (la venta ya guarda su detalle).
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
      montoCobrarBarra: esCortesia ? 0 : precio - montoEntrada,
      ventaId,
      cajaId
    };
  });
  await ejecutarEfectosConfirmados(tareasConfirmadas);
  return resultado as unknown as ResultadoEntrega;
}

/**
 * Anula una entrada pendiente que nunca se sirvió.
 *
 * El dinero se cobró en la puerta: se postea como entrada a la caja del turno
 * actual y la fila queda cerrada. No toca el stock (la bebida no se entregó).
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

/**
 * Barrido del cierre de caja: las entradas pendientes de esa caja se postean
 * como entradas (el dinero se cobró; la cortesía no se entregó) y quedan
 * `anulada`. Sin esto el conteo físico del cierre no coincidiría con el saldo
 * del sistema, porque el garzón cobró dinero que todavía no estaba posteado.
 */
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
