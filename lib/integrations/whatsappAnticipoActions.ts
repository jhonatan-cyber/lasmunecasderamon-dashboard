import { AnticipoRepository } from '@/lib/repositories/AnticipoRepository';

type AnticipoRow = {
  id: string;
  monto: number;
  empleado_nombre: string;
  telefono?: string | null;
};

export async function processAnticipoCommand(
  anticiposPendientes: AnticipoRow[],
  anticipoId: string,
  shouldApprove: boolean,
  adminWhatsApp: string
) {
  const anticipo = anticiposPendientes.find((a) => a.id === anticipoId);

  if (!anticipo) {
    return { ok: false, message: 'Solicitud no encontrada en los pendientes actuales.' };
  }

  try {
    await AnticipoRepository.processSolicitud(anticipoId, shouldApprove ? 'approve' : 'reject');
    return { ok: true, message: `Anticipo de ${anticipo.empleado_nombre} ${shouldApprove ? 'APROBADO' : 'RECHAZADO'} correctamente.` };
  } catch (error: any) {
    return { ok: false, message: `Error al procesar: ${error.message}` };
  }
}
