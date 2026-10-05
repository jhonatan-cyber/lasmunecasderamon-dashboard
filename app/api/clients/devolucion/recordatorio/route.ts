import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ApiResponse } from '@/lib/api/api-response';
import { ClientRepository } from '@/lib/repositories/ClientRepository';
import { enviarRecordatorioDevolucionSaldo } from '@/lib/integrations/whatsappService';
import { registrarRecordatorio } from '@/modules/clientes';

export const POST = withRoute(
  { auth: true, audit: true, module: 'clients', action: 'write' },
  async (request, { user }) => {
    const body = await request.json();
    const { cliente_id, monto, motivo } = body;

    const montoNum = Number(monto);
    if (!cliente_id || !montoNum || montoNum <= 0) {
      return ApiResponse.error(new Error('Datos invalidos: cliente y monto requerido'));
    }

    try {
      const cliente = await ClientRepository.getById(String(cliente_id));
      if (!cliente) {
        return ApiResponse.error(new Error('Cliente no encontrado'));
      }

      const saldoActual = Number((cliente as any).saldo || 0);
      if (montoNum > saldoActual) {
        return ApiResponse.error(
          new Error(`Saldo insuficiente. Disponible: $${saldoActual.toLocaleString('es-CL')}`)
        );
      }
      const solicitadoPor =
        (user as any)?.username ||
        (user as any)?.nick ||
        (user as any)?.name ||
        String((user as any)?.id || 'cajero');
      const clienteNombre = `${(cliente as any).name} ${(cliente as any).lastName}`.trim();

      // Guardar solicitud para que admin la vea en dashboard
      const { solicitud_id: solicitudId } = await registrarRecordatorio({
        clienteId: String(cliente_id),
        monto: montoNum,
        motivo: motivo || 'Solicitud de devolucion',
        solicitadoPor: String((user as any)?.id || (user as any)?.userId || '')
      });

      await enviarRecordatorioDevolucionSaldo({
        clienteNombre,
        clienteRun: (cliente as any).run || null,
        telefono: (cliente as any).phone || null,
        monto: montoNum,
        motivo: motivo || 'Solicitud de devolucion de saldo',
        solicitadoPor,
        saldoActual
      });

      return NextResponse.json({
        success: true,
        message: 'Recordatorio enviado al administrador por WhatsApp',
        solicitud_id: solicitudId
      });
    } catch (error: unknown) {
      return ApiResponse.error(error);
    }
  }
);
