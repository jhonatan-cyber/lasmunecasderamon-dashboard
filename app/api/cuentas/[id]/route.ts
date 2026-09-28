import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { runIdempotent } from '@/lib/api/idempotency';
import { AccountService } from '@/lib/services/AccountService';

export const GET = withPublicRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const data = await AccountService.getById(id);
    if (!data)
      return NextResponse.json(
        { success: false, message: 'Cuenta no encontrada' },
        { status: 404 }
      );
    return NextResponse.json(data);
  }
);

/**
 * Agregar consumos es un PUT de *incremento*: el body trae solo lo nuevo y el
 * servicio lo suma a la cuenta existente. Reintentarlo sin deduplicar cargaría
 * los mismos productos dos veces, así que va envuelto en idempotencia igual que
 * la venta y el pedido: el cajero lo encola sin red con el id de su intención
 * como clave.
 */
export const PUT = withRoute(
  { auth: true, audit: true, module: 'finances', action: 'write' },
  async (request: Request, { params, user }) =>
    runIdempotent(
      request,
      { endpoint: 'cuentas.consumos', usuarioId: user?.id ?? null },
      async () => {
        const id = (await params).id;
        const body = await request.json();
        const cuentaActualizada = await AccountService.updateCuenta(id, body, user.id);
        return NextResponse.json({
          success: true,
          message: 'Cuenta actualizada correctamente',
          data: cuentaActualizada
        });
      }
    )
);

export const DELETE = withRoute(
  { auth: true, audit: true, module: 'finances', action: 'delete' },
  async (_request: Request, { params }) => {
    const id = (await params).id;
    await AccountService.delete(id);
    return NextResponse.json({ success: true, message: 'Cuenta eliminada exitosamente' });
  }
);
