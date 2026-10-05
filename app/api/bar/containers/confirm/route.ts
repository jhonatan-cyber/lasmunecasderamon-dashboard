import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ProductService } from '@/modules/inventario';

/**
 * Segundo paso del control de envases: el almacén confirma la recepción.
 *
 * El barman ya escaneó el envase vacío al entregarlo (POST /api/bar/containers,
 * permiso products/return_container). Aquí el almacén escanea lo que recibe y el
 * sistema verifica que el envase es nuestro y que el bar lo entregó, y recién
 * entonces escribe `fecha_confirmacion` + `confirmado_por` (migración 033).
 *
 * Un diagnóstico negativo (no es nuestro, el bar no lo entregó, ya estaba
 * confirmado) responde 200 con `success: false` para que el panel muestre el
 * motivo. Exige el permiso products/confirm_container_return, que no tiene el
 * barman a propósito: quien entrega no confirma su propia entrega.
 */
export const POST = withRoute(
  { auth: true, audit: true, module: 'products', action: 'confirm_container_return' },
  async (request: Request, context: { params: any; user: { id: string } }) => {
    const payload = await request.json().catch(() => null);
    const codigo = typeof payload?.codigo === 'string' ? payload.codigo.trim() : '';
    if (!codigo) {
      return NextResponse.json(
        { success: false, message: 'El código del envase es requerido' },
        { status: 400 }
      );
    }

    const resultado = await ProductService.confirmContainerReturn(
      codigo,
      context?.user?.id ?? null
    );
    return NextResponse.json({
      success: resultado.ok,
      message: resultado.mensaje,
      data: resultado
    });
  }
);
