import 'server-only';
/**
 * Casos de uso de anulación de entradas pendientes.
 *
 * Un cajero solicita anular una entrada que nunca se sirvió. La solicitud queda
 * pendiente hasta que un administrador apruebe desde el link de WhatsApp. Al
 * aprobar, la entrada se marca como anulada y se registra la devolución en caja
 * con el método elegido (efectivo, tarjeta, transferencia o prepago).
 *
 * A diferencia de las ventas, las entradas no tienen stock, comisiones ni
 * propinas: solo se ajusta el estado de la entrada y el movimiento de caja.
 */
import { enUnaUnidad } from '@/lib/transaction/contract';
import { ejecutarEfectosConfirmados } from '@/lib/transaction/effects';
import { NotFoundError, ValidationError } from '@/lib/errors/errors';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import {
  crearSolicitudAnulacionEntrada,
  actualizarSolicitudAnulacionEntrada,
  leerSolicitudAnulacionEntrada,
  obtenerEntradaPendienteParaAnular,
  marcarEntradaComoAnulada,
  type MetodoDevolucion
} from '@/modules/entradas';
import { obtenerCajaActiva, registrarMovimientoCobro, type MovimientoCobro } from '@/modules/caja';

type Tarea = () => void | Promise<void>;

/**
 * Solicita la anulación de una entrada pendiente.
 *
 * Crea la solicitud en la tabla y devuelve el token para el link de WhatsApp.
 * La entrada **no cambia de estado** hasta que el administrador apruebe.
 */
export async function solicitarAnulacionEntrada(
  entradaId: string,
  motivo: string,
  solicitadoPor: string,
  monto: number
): Promise<string> {
  return await enUnaUnidad(unidad =>
    unidad.ejecutar(async contexto => {
      const token = await crearSolicitudAnulacionEntrada(
        entradaId,
        motivo,
        solicitadoPor,
        monto,
        contexto
      );
      return token;
    })
  );
}

/**
 * Procesa una solicitud de anulación de entrada: aprueba o rechaza.
 *
 * Al aprobar se marca la entrada como anulada y se registra la devolución en
 * caja. Al rechazar la entrada vuelve a su estado original sin cambios.
 */
export async function procesarAnulacionEntrada(
  solicitudId: string,
  aprobado: boolean,
  metodoDevolucion: MetodoDevolucion | null,
  procesadoPor: string
): Promise<{ entradaId: string; monto: number }> {
  const tareas: Tarea[] = [];
  const aplazar = (tarea: Tarea) => tareas.push(tarea);

  let resultado: { entradaId: string; monto: number } | null = null;
  resultado = await enUnaUnidad(unidad =>
    unidad.ejecutar(async contexto => {
      const solicitud = await leerSolicitudAnulacionEntrada(solicitudId, contexto);
      if (!solicitud) throw new NotFoundError('Solicitud de anulación', solicitudId);
      if (solicitud.estado !== 'pendiente')
        throw new ValidationError('La solicitud ya fue procesada');

      const estadoFinal = aprobado ? 'confirmada' : 'rechazada';
      await actualizarSolicitudAnulacionEntrada(
        solicitudId,
        estadoFinal,
        metodoDevolucion,
        procesadoPor,
        contexto
      );

      if (!aprobado) {
        return { entradaId: solicitud.entrada_id, monto: solicitud.monto };
      }

      // Aprobar: marcar la entrada como anulada
      const filas = await obtenerEntradaPendienteParaAnular(solicitud.entrada_id, contexto);
      const entrada = filas[0];
      if (!entrada) throw new NotFoundError('Entrada', solicitud.entrada_id);
      if (entrada.cover_estado !== 'pendiente')
        throw new ValidationError('Esta entrada ya fue entregada o anulada');

      await marcarEntradaComoAnulada(
        { entradaId: entrada.id, procesadoPor, fecha: getNowInBusinessTimezone() },
        contexto
      );

      // Registrar la devolución en caja si hay método de devolución
      if (metodoDevolucion && solicitud.monto > 0) {
        const cajaId = await obtenerCajaActiva(contexto);
        if (cajaId) {
          const movimiento: MovimientoCobro = {};
          movimiento[metodoDevolucion] = -solicitud.monto;
          await registrarMovimientoCobro(cajaId, movimiento, contexto);
        }
      }

      return { entradaId: solicitud.entrada_id, monto: solicitud.monto };
    })
  );

  await ejecutarEfectosConfirmados(tareas);
  return resultado!;
}
