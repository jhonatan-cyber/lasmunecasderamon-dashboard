import 'server-only';
import {
  getAnticipoBalances,
  tieneSolicitudPendiente,
  listarAnticipos,
  obtenerSolicitudAnticipoPorId,
  solicitarAnticipo,
  procesarSolicitud,
  entregarAnticipo,
  GratificacionService
} from '@/modules/personal';
import { listarSolicitudes, obtenerSolicitud, solicitarDevolucionSaldo } from '@/modules/clientes';
import {
  listarTransferencias,
  traspasarAlBar,
  aceptarTransferencia,
  rechazarTransferencia
} from '@/modules/inventario';
import { listarSolicitudesCierrePendientes, CashRegisterService } from '@/modules/caja';
import {
  ServiceRequestService,
  ServiceService,
  AccountService,
  listarSolicitudesCuentasPendientes,
  listarSolicitudesAnulacionServiciosPendientes,
  obtenerSolicitudAnulacionServicioPorToken,
  procesarAnulacionCuentaCanal
} from '@/modules/operacion';
import {
  listarSolicitudesPendientes,
  obtenerVentaParaAnulacion,
  obtenerSolicitudPorToken
} from '@/modules/ventas';
import { SaleService } from '@/workflows/ventas';
import { resolverSolicitudDevolucion } from '@/workflows/prepago';
import { solicitarOProcesarCierreCaja } from '@/lib/api/cierreCaja';
import { BusinessError, NotFoundError, ValidationError } from '@/lib/errors/errors';
import type { ComandoSolicitud, TipoSolicitud } from '@/lib/mcp/solicitudes-schema';

const TIPOS: TipoSolicitud[] = [
  'anticipo',
  'devolucion',
  'gratificacion',
  'servicio',
  'transferencia',
  'cierre_caja',
  'anulacion_venta',
  'anulacion_servicio',
  'anulacion_cuenta'
];
type Fila = Record<string, any>;

// Los tokens de enlaces públicos no salen del servidor MCP.
function sinTokens(fila: Fila) {
  const { token: _token, push_token: _push, ...datos } = fila;
  return datos;
}

async function pendientes(tipo: TipoSolicitud): Promise<Fila[]> {
  switch (tipo) {
    case 'anticipo':
      return (await listarAnticipos({ estado: 2, limit: 50 })).data;
    case 'devolucion':
      return (await listarSolicitudes(null)).filter(s => s.estado === 'pendiente');
    case 'gratificacion':
      return (await GratificacionService.getAll()).filter(s => s.estado === 2);
    case 'servicio':
      return ServiceRequestService.getAll('pendiente');
    case 'transferencia':
      return listarTransferencias(true);
    case 'cierre_caja':
      return listarSolicitudesCierrePendientes();
    case 'anulacion_venta':
      return listarSolicitudesPendientes();
    case 'anulacion_servicio':
      return listarSolicitudesAnulacionServiciosPendientes();
    case 'anulacion_cuenta':
      return listarSolicitudesCuentasPendientes();
  }
}

function normalizar(tipo: TipoSolicitud, fila: Fila) {
  const monto = Number(fila.monto ?? fila.monto_cierre_calculado ?? fila.total ?? 0);
  return {
    ...sinTokens(fila),
    tipo,
    id: String(fila.id ?? fila.id_anticipo ?? fila.id_solicitud ?? fila.solicitud_id),
    monto,
    estado: 'pendiente',
    efecto_al_aprobar:
      tipo === 'anticipo'
        ? 'Autoriza; no entrega dinero.'
        : tipo === 'devolucion'
          ? 'Descuenta saldo prepago y registra devolución por transferencia; no ordena una transferencia bancaria.'
          : tipo === 'gratificacion'
            ? 'Pasa a pendiente de pago en planilla.'
            : tipo === 'cierre_caja'
              ? 'Cierra la caja; el backend recalcula el cierre al aprobar.'
              : tipo === 'transferencia'
                ? 'Ingresa las unidades al bar.'
                : tipo.startsWith('anulacion_')
                  ? 'Aplica la anulación y los ajustes del flujo existente.'
                  : 'Crea el servicio a partir de la solicitud.'
  };
}

export async function consultarSolicitudes(
  tipo: TipoSolicitud | undefined,
  limit: number,
  offset: number
) {
  const grupos = await Promise.all(
    (tipo ? [tipo] : TIPOS).map(async tipoActual => {
      if (tipoActual === 'anticipo') {
        const { data, total } = await listarAnticipos({ estado: 2, limit, offset });
        return {
          tipo: tipoActual,
          items: data.map(f => normalizar(tipoActual, f)),
          total,
          limit,
          offset,
          hay_mas: offset + data.length < total
        };
      }
      const filas = await pendientes(tipoActual);
      return {
        tipo: tipoActual,
        items: filas.slice(offset, offset + limit).map(f => normalizar(tipoActual, f)),
        total: filas.length,
        limit,
        offset,
        hay_mas: offset + limit < filas.length
      };
    })
  );
  return { grupos, total_pendientes: grupos.reduce((n, g) => n + g.total, 0) };
}

export async function detalleSolicitud(tipo: TipoSolicitud, id: string): Promise<Fila> {
  if (tipo === 'anticipo') {
    const [fila] = await obtenerSolicitudAnticipoPorId(id);
    if (!fila) throw new NotFoundError('Anticipo', id);
    return {
      ...sinTokens(fila),
      id,
      tipo,
      monto: Number(fila.monto),
      estado: Number(fila.estado),
      efecto_al_aprobar: 'Autoriza; entregar dinero es una operación separada.'
    };
  }
  if (tipo === 'devolucion') {
    const fila = await obtenerSolicitud(id);
    if (!fila) throw new NotFoundError('Devolución', id);
    return {
      ...fila,
      tipo,
      monto: Number(fila.monto),
      efecto_al_aprobar: 'Descuenta saldo; no ordena una transferencia bancaria.'
    };
  }
  if (tipo === 'gratificacion') {
    const fila = await GratificacionService.getSolicitudDetalle(id);
    return {
      ...fila,
      tipo,
      estado: 'pendiente',
      efecto_al_aprobar: 'Pasa a pendiente de pago en planilla.'
    };
  }
  if (tipo === 'servicio') {
    const fila = await ServiceRequestService.getById(id);
    return { ...normalizar(tipo, fila), estado: fila.estado };
  }
  const fila = (await pendientes(tipo)).find(f => String(f.id ?? f.solicitud_id) === id);
  if (!fila) throw new NotFoundError('Solicitud pendiente', id);
  return normalizar(tipo, fila);
}

export async function limiteAnticipo(usuarioId: string) {
  const [balances, pendiente] = await Promise.all([
    getAnticipoBalances(usuarioId),
    tieneSolicitudPendiente(usuarioId)
  ]);
  return { usuario_id: usuarioId, ...balances, tiene_solicitud_pendiente: pendiente };
}

function verificarMonto(actual: unknown, esperado: number) {
  if (Number(actual) !== esperado)
    throw new BusinessError('El monto cambió; consulta el detalle y confirma nuevamente');
}

export async function ejecutarSolicitud(
  comando: ComandoSolicitud,
  admin: { id: string; role: string; name?: string; nick?: string | null }
) {
  const adminId = String(admin.id);
  switch (comando.accion) {
    case 'crear_anticipo':
      return solicitarAnticipo(comando.usuario_id, comando, adminId);
    case 'crear_devolucion':
      return solicitarDevolucionSaldo(comando.cliente_id, comando.monto, comando.motivo, adminId);
    case 'crear_gratificacion':
      return GratificacionService.solicitarParaUsuario(
        comando.usuario_id,
        comando.monto,
        comando.motivo,
        adminId
      );
    case 'crear_transferencia': {
      const resultado = await traspasarAlBar({ ...comando, usuario_id: adminId });
      return { ...resultado, id: resultado.transferencia_id, estado: 'pendiente' };
    }
    case 'crear_servicio':
      return ServiceRequestService.create(comando, adminId);
    case 'crear_anulacion': {
      if (comando.tipo === 'anulacion_venta') {
        const venta = await obtenerVentaParaAnulacion(comando.entidad_id);
        if (!venta) throw new NotFoundError('Venta', comando.entidad_id);
        if (comando.monto > Number(venta.total))
          throw new ValidationError('El monto supera el total de la venta');
        const token = await SaleService.requestAnulacion(
          comando.entidad_id,
          comando.motivo,
          adminId,
          comando.monto
        );
        const [solicitud] = await obtenerSolicitudPorToken(token);
        return { id: solicitud.id, estado: 'pendiente' };
      }
      if (comando.tipo === 'anulacion_cuenta')
        return {
          id: await AccountService.requestAnulacion(
            comando.entidad_id,
            comando.motivo,
            adminId,
            comando.monto
          ),
          estado: 'pendiente'
        };
      const servicio = await ServiceService.getById(comando.entidad_id);
      if (!servicio) throw new NotFoundError('Servicio', comando.entidad_id);
      verificarMonto(servicio.total, comando.monto); // Este flujo solo admite anulación total.
      const token = await ServiceService.requestAnulacion(
        comando.entidad_id,
        comando.motivo,
        adminId
      );
      const [solicitud] = await obtenerSolicitudAnulacionServicioPorToken(token);
      return { id: solicitud.id, estado: 'pendiente' };
    }
    case 'entregar_anticipo': {
      const fila = await detalleSolicitud('anticipo', comando.solicitud_id);
      verificarMonto(fila.monto, comando.monto_esperado);
      return entregarAnticipo(comando.solicitud_id, adminId, comando.monto_esperado);
    }
    case 'cerrar_caja':
      return solicitarOProcesarCierreCaja({
        user: admin,
        id_caja: comando.caja_id,
        motivo: comando.motivo
      });
    case 'resolver': {
      const { tipo, solicitud_id: id, decision, monto_esperado } = comando;
      const fila = await detalleSolicitud(tipo, id);
      verificarMonto(fila.monto, monto_esperado);
      const action = decision === 'aprobar' ? 'approve' : 'reject';
      if (tipo === 'anticipo') return procesarSolicitud(id, action, adminId, monto_esperado);
      if (tipo === 'devolucion')
        return resolverSolicitudDevolucion(id, decision, adminId, monto_esperado);
      if (tipo === 'gratificacion')
        return GratificacionService.processSolicitud(id, action, adminId, monto_esperado);
      if (tipo === 'servicio') {
        if (decision === 'rechazar' && !comando.motivo)
          throw new ValidationError('Motivo requerido para rechazar el servicio');
        return decision === 'aprobar'
          ? ServiceRequestService.approve(id, adminId, undefined, monto_esperado)
          : ServiceRequestService.reject(id, adminId, comando.motivo!, monto_esperado);
      }
      if (tipo === 'transferencia') {
        await (decision === 'aprobar'
          ? aceptarTransferencia(id, adminId)
          : rechazarTransferencia(id, adminId));
        return { id, estado: decision === 'aprobar' ? 'aceptada' : 'rechazada' };
      }
      if (tipo === 'cierre_caja') {
        const cierre = (await listarSolicitudesCierrePendientes()).find(s => s.id === id);
        if (!cierre) throw new NotFoundError('Solicitud de cierre', id);
        return CashRegisterService.procesarCierreCaja({
          token: cierre.token,
          action: decision === 'aprobar' ? 'confirmar' : 'rechazar',
          usuarioId: adminId,
          resueltoPor: admin.nick || admin.name || adminId
        });
      }
      const status = decision === 'aprobar' ? 'confirmada' : 'rechazada';
      if (tipo === 'anulacion_venta') await SaleService.processAnulacion(id, adminId, status);
      else if (tipo === 'anulacion_servicio')
        await ServiceService.processAnulacion(id, adminId, status);
      else
        await procesarAnulacionCuentaCanal(
          { id_cuenta: fila.id_cuenta, solicitud_id: id, monto: Number(fila.monto), adminId },
          decision === 'aprobar' ? 'confirmar' : 'rechazar'
        );
      return { id, estado: status };
    }
  }
}
