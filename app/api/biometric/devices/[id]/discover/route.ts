import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { descubrirIpDispositivo } from '@/lib/biometric/ipDiscovery';

/**
 * Re-encontrar el equipo por su MAC cuando el DHCP le cambió la IP.
 *
 * El terminal no es fijo: su IP la asigna el router. Guardar la MAC (que sí es
 * fija) y re-barrer la red confirmando con el serial permite volver a apuntarle
 * sin tocar la identidad del equipo. POST `{"forzar": false}` solo chequea la
 * IP actual; por omisión (`true`) busca en toda la subred.
 */
export const POST = withRoute(
  { auth: true, access: 'administrator', audit: true },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const forzar = body?.forzar !== false;
    const resultado = await descubrirIpDispositivo(id, { forzar });
    const status = resultado.ok
      ? 200
      : resultado.codigo === 'NO_ENCONTRADO'
        ? 404
        : resultado.codigo === 'SIN_CREDENCIALES'
          ? 400
          : 502;
    return NextResponse.json(
      { success: resultado.ok, message: resultado.mensaje, data: resultado },
      { status }
    );
  }
);
