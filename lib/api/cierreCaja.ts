import { CashRegisterService } from '@/modules/caja';
import { enviarMensajeSolicitudCierreCaja } from '@/modules/comunicaciones';
import { isAdministrator } from '@/lib/middleware/auth';
import { AVISO_CIERRE_ENFRIAMIENTO_MS } from '@/modules/caja/contracts';
import logger from '@/lib/utils/logger';

export interface CierreCajaSolicitante {
  id: string | number;
  nick?: string | null;
  name?: string | null;
  /** Requerido: decide si cierra en el acto o pide autorización. */
  role: string;
}

export interface ResultadoCierreCaja {
  estado: 'cerrada' | 'pendiente';
  /** `true` cuando el administrador la cerró en el acto o el pedido salió por WhatsApp. */
  avisado: boolean;
  message: string;
  /** Código HTTP sugerido: 200 normal, 202 cuando el WhatsApp al admin no salió. */
  httpStatus: number;
  caja: unknown;
  token: string | null;
  montoCierre: number;
  saldoClientesDescontado: number;
}

/**
 * Manda al administrador el desglose del cierre pendiente.
 *
 * Lo usan las dos salidas hacia WhatsApp: el aviso original al crear la solicitud y el
 * reenvío, para que el mensaje que llega sea idéntico (salvo el rótulo de reenvío).
 */
export async function avisarCierreAlAdministrador(args: {
  cajaId: string;
  caja: Record<string, any>;
  cajeroNombre: string;
  saldoClientes: number;
  montoCierre: number;
  motivo?: string | null;
  token: string;
  reenvio?: boolean;
}): Promise<void> {
  const { cajaId, caja, cajeroNombre, saldoClientes, montoCierre, motivo, token, reenvio } = args;

  await enviarMensajeSolicitudCierreCaja({
    cajaId,
    cajeroNombre,
    fechaApertura: String(caja.fecha_apertura ?? ''),
    montoApertura: Number(caja.monto_apertura || 0),
    efectivo: Number(caja.efectivo || 0),
    tarjeta: Number(caja.tarjeta || 0),
    transferencia: Number(caja.transferencia || 0),
    devoluciones: Number(caja.devoluciones || 0),
    retiroTotal: Number(caja.retiro_total || 0),
    // Detalle del turno: qué produjo la caja y el prepago de los clientes, para que el
    // administrador decida sin abrir el dashboard. `caja` viene mapeada (CajaType), así que
    // trae las claves del dominio (`propina`, `comision`, `prepago_*`).
    ventas: Number(caja.ventas || 0),
    servicios: Number(caja.servicios || 0),
    propinas: Number(caja.propina || 0),
    comisiones: Number(caja.comision || 0),
    anticipos: Number(caja.anticipo || 0),
    iva: Number(caja.iva || 0),
    prepagoCargado: Number(caja.prepago_cargado || 0),
    prepagoConsumido: Number(caja.prepago_consumido || 0),
    prepagoPendienteClientes: Number(caja.prepago_pendiente_clientes || 0),
    saldoClientes,
    montoCierre,
    motivo,
    token,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
    reenvio
  });
}

/**
 * Cierre de caja con autorización del administrador.
 *
 * - **Administrador**: cierra en el acto. Pedirse autorización a sí mismo no tiene
 *   sentido, y de madrugada nadie puede quedarse esperando el link.
 * - **Cualquier otro rol**: no cierra nada. Crea la solicitud en estado `pendiente`,
 *   manda el link por WhatsApp al administrador y la caja **sigue abierta**. Si el
 *   cajero se va sin que contesten, queda abierta a propósito: cerrar de prepo
 *   movería el efectivo de turno.
 *
 * Al cerrar se descuentan del efectivo los saldos prepago que los clientes todavía
 * tienen cargados, porque ese dinero se cobró en un turno anterior y no está en el
 * cajón.
 *
 * Vive en `lib/api` y no dentro de una ruta porque la usan las dos superficies de
 * cierre (`/api/cashregister/cierre` y el `PATCH /api/cashregister` legacy): así no
 * queda ningún camino que cierre la caja saltándose la autorización.
 */
export async function solicitarOProcesarCierreCaja(args: {
  user: CierreCajaSolicitante;
  id_caja: string;
  motivo?: string | null;
}): Promise<ResultadoCierreCaja> {
  const { user, id_caja, motivo } = args;
  const nombre = user.nick || user.name || String(user.id);

  if (isAdministrator(user)) {
    // Si un cajero ya pidió el cierre, se resuelve **esa** solicitud en vez de
    // cerrar por fuera: de otro modo la solicitud quedaría `pendiente` para
    // siempre (y el índice único impediría pedir el cierre del turno otra vez).
    const pendiente = await CashRegisterService.getCierrePendiente(id_caja);

    if (pendiente?.token) {
      const resuelto = await CashRegisterService.procesarCierreCaja({
        token: pendiente.token,
        action: 'confirmar',
        usuarioId: String(user.id),
        resueltoPor: nombre
      });

      return {
        estado: 'cerrada',
        avisado: true,
        message: 'Caja cerrada',
        httpStatus: 200,
        caja: resuelto.caja,
        token: pendiente.token,
        montoCierre: Number(resuelto.caja?.monto_cierre || 0),
        saldoClientesDescontado: resuelto.saldo_clientes_descontado
      };
    }

    const caja = await CashRegisterService.closeCaja({
      id_caja,
      usuario_id_cierre: String(user.id)
    });

    return {
      estado: 'cerrada',
      avisado: true,
      message: 'Caja cerrada',
      httpStatus: 200,
      caja,
      token: null,
      montoCierre: Number(caja?.monto_cierre || 0),
      saldoClientesDescontado: Number(caja?.saldo_clientes_descontado || 0)
    };
  }

  const solicitud = await CashRegisterService.solicitarCierreCaja({
    id_caja,
    motivo: motivo ?? undefined,
    usuarioId: String(user.id),
    solicitadoPor: nombre
  });

  try {
    await avisarCierreAlAdministrador({
      cajaId: id_caja,
      caja: solicitud.caja as Record<string, any>,
      cajeroNombre: nombre,
      saldoClientes: solicitud.saldo_clientes_descontado,
      montoCierre: solicitud.monto_cierre_calculado,
      motivo,
      token: solicitud.token
    });
  } catch (err) {
    // La solicitud ya existe: que falle el WhatsApp no puede perderla. Se avisa con
    // 202 para que la pantalla diga la verdad (quedó pendiente, sin aviso enviado).
    logger.error('[CierreCaja] Error enviando WhatsApp al administrador:', { err });
    return {
      estado: 'pendiente',
      avisado: false,
      message: solicitud.reemplazo
        ? 'Se pidió el cierre de nuevo, pero no se pudo enviar WhatsApp al administrador'
        : 'Solicitud creada pero no se pudo enviar WhatsApp al administrador',
      httpStatus: 202,
      caja: solicitud.caja,
      token: solicitud.token,
      montoCierre: solicitud.monto_cierre_calculado,
      saldoClientesDescontado: solicitud.saldo_clientes_descontado
    };
  }

  return {
    estado: 'pendiente',
    avisado: true,
    // Cuando reemplaza una solicitud que quedó sin respuesta, decirlo importa: el cajero
    // acaba de reabrir el cierre, no de pedirlo por primera vez.
    message: solicitud.reemplazo
      ? 'Se pidió el cierre de nuevo al administrador'
      : 'Solicitud de cierre enviada al administrador',
    httpStatus: 200,
    caja: solicitud.caja,
    token: solicitud.token,
    montoCierre: solicitud.monto_cierre_calculado,
    saldoClientesDescontado: solicitud.saldo_clientes_descontado
  };
}

export interface ResultadoReenvioAviso {
  /** `true` solo cuando el WhatsApp salió. */
  avisado: boolean;
  message: string;
  /** 200 enviado, 409 sin cierre pendiente, 429 esperando el enfriamiento, 202 falló el envío. */
  httpStatus: number;
  ultimoAvisoEn: string | null;
  /** Segundos que le faltan al cajero para poder reenviar (0 = puede ya). */
  esperarSegundos: number;
}

/**
 * Reenvía al administrador el aviso de un cierre que quedó esperando autorización.
 *
 * Existe porque el cierre se puede quedar en silencio: el WhatsApp no llegó, el admin no
 * lo vio, o pasó el rato. Sin esto, la única salida era que un administrador cerrara
 * desde el dashboard, porque el índice único parcial impide pedir el cierre dos veces.
 *
 * Reenvía **la misma solicitud** (mismo token, mismo link, mismos montos): no crea una
 * nueva ni recalcula el descuento de saldos. El descuento se recalcula al autorizar, así
 * que el número que autorice siempre será el del momento del cierre, no el de este aviso.
 *
 * Un enfriamiento de `AVISO_CIERRE_ENFRIAMIENTO_MS` evita que insistir desde la pantalla
 * convierta el WhatsApp del administrador en spam (Twilio termina limitando el número).
 * El sello de "ya avisé" se escribe **después** de que el envío sale: si falla, el cajero
 * puede reintentar enseguida en vez de quedar esperando el enfriamiento.
 */
export async function reenviarAvisoCierreCaja(args: {
  id_caja: string;
  solicitante: string;
}): Promise<ResultadoReenvioAviso> {
  const { id_caja, solicitante } = args;

  const pendiente = await CashRegisterService.getCierrePendiente(id_caja);

  if (!pendiente?.token) {
    return {
      avisado: false,
      message: 'Esta caja no tiene un cierre esperando autorización',
      httpStatus: 409,
      ultimoAvisoEn: null,
      esperarSegundos: 0
    };
  }

  const esperarSegundos = await CashRegisterService.segundosParaReenviarAviso(id_caja);

  if (esperarSegundos > 0) {
    return {
      avisado: false,
      message: `El aviso salió hace menos de un minuto. Podrás reenviarlo en ${esperarSegundos} s.`,
      httpStatus: 429,
      ultimoAvisoEn: pendiente.ultimo_aviso_en ?? null,
      esperarSegundos
    };
  }

  const caja = await CashRegisterService.getById(id_caja);

  if (!caja) {
    return {
      avisado: false,
      message: 'La caja no existe',
      httpStatus: 404,
      ultimoAvisoEn: pendiente.ultimo_aviso_en ?? null,
      esperarSegundos: 0
    };
  }

  try {
    await avisarCierreAlAdministrador({
      cajaId: id_caja,
      caja: caja as Record<string, any>,
      cajeroNombre: pendiente.solicitado_por || solicitante,
      saldoClientes: Number(pendiente.saldo_clientes_descontado || 0),
      montoCierre: Number(pendiente.monto_cierre_calculado || 0),
      motivo: pendiente.motivo,
      token: pendiente.token,
      reenvio: true
    });
  } catch (err) {
    logger.error('[CierreCaja] Error reenviando el WhatsApp al administrador:', { err });
    return {
      avisado: false,
      message: 'No se pudo reenviar el aviso al administrador',
      httpStatus: 202,
      ultimoAvisoEn: pendiente.ultimo_aviso_en ?? null,
      esperarSegundos: 0
    };
  }

  const ultimoAvisoEn = await CashRegisterService.registrarAvisoCierre(pendiente.token);

  return {
    avisado: true,
    message: 'Aviso reenviado al administrador',
    httpStatus: 200,
    ultimoAvisoEn,
    esperarSegundos: AVISO_CIERRE_ENFRIAMIENTO_MS / 1000
  };
}

/** Respuesta uniforme del reenvío del aviso de cierre. */
export const respuestaReenvioAviso = (resultado: ResultadoReenvioAviso) =>
  ({
    success: resultado.avisado,
    message: resultado.message,
    data: {
      ultimo_aviso_en: resultado.ultimoAvisoEn,
      esperar_segundos: resultado.esperarSegundos
    }
  }) as const;

/** Respuesta uniforme de las dos superficies de cierre. */
export const respuestaCierreCaja = (resultado: ResultadoCierreCaja) =>
  ({
    success: resultado.avisado,
    message: resultado.message,
    data: {
      estado: resultado.estado,
      caja: resultado.caja,
      token: resultado.token,
      monto_cierre_calculado: resultado.montoCierre,
      saldo_clientes_descontado: resultado.saldoClientesDescontado
    }
  }) as const;
