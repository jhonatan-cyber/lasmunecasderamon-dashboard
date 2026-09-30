import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { CashRegisterService } from '@/lib/services/CashRegisterService';
import { CajaOpenSchema, CajaCloseSchema } from '@/lib/business/schemas/caja';
import { validateOrResponse } from '@/lib/api/validate';
import { respuestaCierreCaja, solicitarOProcesarCierreCaja } from '@/lib/api/cierreCaja';

export const GET = withRoute(
  { auth: true, audit: true, module: 'finances', action: 'read' },
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const resumen = searchParams.get('resumen');

    if (resumen === '1') {
      const data = await CashRegisterService.summary();
      return NextResponse.json({ success: true, data });
    }

    const data = await CashRegisterService.getAll();
    return NextResponse.json({ success: true, data });
  }
);

export const POST = withRoute(
  { auth: true, audit: true, module: 'finances', action: 'write' },
  async (request: Request) => {
    const body = await request.json();
    const validated = validateOrResponse(CajaOpenSchema, body);
    if (validated instanceof NextResponse) return validated;
    const id = await CashRegisterService.openCaja(validated);
    return NextResponse.json({ success: true, message: 'Caja abierta', id }, { status: 201 });
  }
);

export const PUT = withRoute(
  { auth: true, audit: true, module: 'finances', action: 'write' },
  async (request: Request) => {
    const body = await request.json();
    const { id_caja, ...data } = body;
    if (!id_caja)
      return NextResponse.json({ success: false, message: 'ID requerido' }, { status: 400 });

    await CashRegisterService.updateCaja(id_caja, data);
    return NextResponse.json({ success: true, message: 'Caja actualizada' });
  }
);

/**
 * Cierre de caja (ruta histórica).
 *
 * Delega en el mismo flujo que `/api/cashregister/cierre`: el administrador cierra
 * en el acto y el resto pide autorización por WhatsApp. No se cierra directo para
 * que no quede un camino que se saltee la autorización.
 */
export const PATCH = withRoute(
  { auth: true, audit: true, module: 'finances', action: 'write' },
  async (request: Request, { user }) => {
    const body = await request.json();
    const validated = validateOrResponse(CajaCloseSchema, body);
    if (validated instanceof NextResponse) return validated;

    const resultado = await solicitarOProcesarCierreCaja({
      user,
      id_caja: validated.id_caja
    });

    return NextResponse.json(respuestaCierreCaja(resultado), {
      status: resultado.httpStatus
    });
  }
);
