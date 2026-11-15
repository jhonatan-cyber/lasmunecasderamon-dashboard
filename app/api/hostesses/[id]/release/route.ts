import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { enUnaUnidad } from '@/lib/transaction/contract';
import { verificarAnfitrionaOcupada, actualizarDisponibilidad } from '@/modules/identidad';
import { sendNotificationToAll } from '@/lib/api/sseService';

export const POST = withRoute(
  { auth: true, audit: true, module: 'users', action: 'write' },
  async (request, { params }) => {
    const { id } = await params;
    const userId = String(id);

    // Verificar que el usuario es anfitriona y está ocupada
    await verificarAnfitrionaOcupada(userId);

    await enUnaUnidad(async (unidad) => {
      await unidad.ejecutar(async (contexto) => {
        // Liberar la anfitriona
        await actualizarDisponibilidad([userId], contexto);
      });
    });

    sendNotificationToAll('resource_updated', { module: 'users' });

    return NextResponse.json({
      success: true,
      message: 'Anfitriona liberada correctamente'
    });
  }
);
