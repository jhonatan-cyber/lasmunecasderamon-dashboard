import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ApiResponse } from '@/lib/api/api-response';
import { existeSolicitudAnulacionEntrada, listarEntradas } from '@/modules/entradas';
import { enviarMensajeSolicitudAnulacionEntrada } from '@/modules/comunicaciones';
import { obtenerCajaActiva } from '@/modules/caja';
import { solicitarAnulacionEntrada } from '@/workflows/anulaciones-entrada';
import { AppError, ValidationError } from '@/lib/errors/errors';
import { notificarEntradaActualizada } from '@/lib/notifications/entradaNotificationUtils';
import logger from '@/lib/utils/logger';

/**
 * Solicita la anulación de una entrada pendiente.
 *
 * Crea una solicitud que debe ser aprobada por un administrador. Se envía
 * un mensaje de WhatsApp con los datos de la entrada y el estado de la caja.
 * La entrada no cambia de estado hasta que el administrador apruebe.
 */
export const POST = withRoute(
  { auth: true, audit: true, module: 'entradas', action: 'deliver' },
  async (request: Request, { params, user }) => {
    const id = (await params).id;
    if (!id) throw new ValidationError('Indica la entrada a anular');

    const body = await request.json().catch(() => ({}));
    if (!body.motivo || !String(body.motivo).trim())
      throw new ValidationError('Debes ingresar el motivo de la anulacion');

    // Verificar que no haya una solicitud pendiente ya
    const yaSolicitada = await existeSolicitudAnulacionEntrada(id);
    if (yaSolicitada)
      throw new ValidationError('Esta entrada ya tiene una solicitud de anulacion registrada');

    // Obtener datos de la entrada
    const entradas = await listarEntradas(new Date().toISOString().slice(0, 10));
    const entrada = entradas.find(e => e.id === id);
    if (!entrada) throw new ValidationError('La entrada no existe');

    const monto = Number(entrada.monto_entrada);
    const clienteNombre = entrada.cliente_nombre || 'Sin nombre';
    const metodoPago = entrada.metodo_pago;

    // Obtener datos de la caja activa
    let cajaApertura = 0;
    let cajaEfectivo = 0;
    let cajaTarjeta = 0;
    let cajaTransferencia = 0;
    let cajaDevoluciones = 0;
    try {
      const cajaId = await obtenerCajaActiva();
      if (cajaId) {
        const { CashRegisterService } = await import('@/modules/caja');
        const caja = await CashRegisterService.getById(cajaId);
        if (caja) {
          cajaApertura = Number(caja.monto_apertura || 0);
          cajaEfectivo = Number(caja.efectivo || 0);
          cajaTarjeta = Number(caja.tarjeta || 0);
          cajaTransferencia = Number(caja.transferencia || 0);
          cajaDevoluciones = Number(caja.devoluciones || 0);
        }
      }
    } catch (err) {
      logger.warn('[AnulacionEntrada] No se pudo obtener datos de caja:', { err });
    }

    try {
      const token = await solicitarAnulacionEntrada(
        id,
        body.motivo,
        user.nick || user.name || user.id.toString(),
        monto
      );

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      logger.info('[AnulacionEntrada] baseUrl configurada:', baseUrl);

      try {
        await enviarMensajeSolicitudAnulacionEntrada({
          clienteNombre,
          cantidadEntradas: 1,
          metodoPago,
          total: monto,
          solicitadoPor: user.nick || user.name || 'Usuario',
          cajaApertura,
          cajaEfectivo,
          cajaTarjeta,
          cajaTransferencia,
          cajaDevoluciones,
          token,
          baseUrl
        });
      } catch (err) {
        logger.error('[AnulacionEntrada] Error enviando WhatsApp:', { err });
        return NextResponse.json(
          {
            success: false,
            message: 'Solicitud creada pero no se pudo enviar WhatsApp al administrador',
            token
          },
          { status: 202 }
        );
      }

      // Notificar a las sesiones que hay una solicitud pendiente
      notificarEntradaActualizada({
        entradaId: id,
        accion: 'solicitud_anulacion',
        clienteNombre: null,
        entregadaPorNombre: ''
      });

      return NextResponse.json({ success: true, token });
    } catch (error) {
      if (error instanceof AppError) return ApiResponse.error(error);
      logger.error('[AnulacionEntrada] Error inesperado:', { error });
      return ApiResponse.error(error);
    }
  }
);
