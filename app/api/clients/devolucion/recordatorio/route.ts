import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ApiResponse } from '@/lib/api/api-response';
import { ClientRepository } from '@/lib/repositories/ClientRepository';
import { enviarRecordatorioDevolucionSaldo } from '@/lib/integrations/whatsappService';
import { query, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

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
        return ApiResponse.error(new Error(`Saldo insuficiente. Disponible: $${saldoActual.toLocaleString('es-CL')}`));
      }

      const solicitadoPor = (user as any)?.username || (user as any)?.nick || (user as any)?.name || String((user as any)?.id || 'cajero');
      const clienteNombre = `${(cliente as any).name} ${(cliente as any).lastName}`.trim();

      // Guardar solicitud para que admin la vea en dashboard
      const solicitudId = generateUUID();
      const now = getNowInBusinessTimezone();
      const userId = String((user as any)?.id || (user as any)?.userId || '');
      try {
        await query(
          `INSERT INTO solicitudes_devolucion_saldo (id, cliente_id, monto, motivo, solicitado_por, estado, fecha_crea, metodo_pago) VALUES (?, ?, ?, ?, ?, 'pendiente', ?, 'transferencia')`,
          [solicitudId, String(cliente_id), montoNum, motivo || 'Solicitud de devolucion', userId || null, now]
        );
      } catch (dbErr) {
        // No bloquea el recordatorio si falla el insert (tabla puede no existir aun)
        console.error('Error guardando solicitud devolucion:', dbErr);
      }

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
