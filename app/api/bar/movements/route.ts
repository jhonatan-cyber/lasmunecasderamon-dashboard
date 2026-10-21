import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { ProductService } from '@/modules/inventario';
import { ValidationError } from '@/lib/errors/errors';

/** Día en formato de negocio; vacío = sin límite de ese lado. */
function fechaDeParametro(valor: string | null, nombre: string): string | undefined {
  if (!valor) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor))
    throw new ValidationError(`La ${nombre} debe tener formato AAAA-MM-DD`);
  return valor;
}

function enteroDeParametro(valor: string | null, nombre: string): number | undefined {
  if (valor === null || valor === '') return undefined;
  if (!/^\d+$/.test(valor)) throw new ValidationError(`${nombre} debe ser un número entero`);
  return Number(valor);
}

export const GET = withPublicRoute(async (request: Request) => {
  const searchParams = new URL(request.url).searchParams;
  const desde = fechaDeParametro(searchParams.get('desde'), 'fecha inicial');
  const hasta = fechaDeParametro(searchParams.get('hasta'), 'fecha final');
  const tipo = searchParams.get('tipo')?.trim() || undefined;
  if (tipo && !/^[a-z_]{1,30}$/.test(tipo))
    throw new ValidationError('Tipo de movimiento inválido');
  const q = searchParams.get('q')?.trim() || undefined;
  if (q && q.length > 100) throw new ValidationError('La búsqueda no puede superar 100 caracteres');

  const page = enteroDeParametro(searchParams.get('page'), 'La página');
  const limit = enteroDeParametro(searchParams.get('limit'), 'El límite');
  if (page !== undefined && page < 1) throw new ValidationError('La página debe ser 1 o mayor');
  if (limit !== undefined && (limit < 1 || limit > 500))
    throw new ValidationError('El límite debe estar entre 1 y 500');

  const historial = await ProductService.buscarMovimientosRecientes({
    ...(desde ? { desde } : {}),
    ...(hasta ? { hasta } : {}),
    ...(tipo ? { tipo } : {}),
    ...(q ? { q } : {}),
    ...(page !== undefined ? { page } : {}),
    ...(limit !== undefined ? { limit } : {})
  });

  return NextResponse.json({
    success: true,
    data: historial.movimientos,
    meta: {
      total: historial.total,
      pagina: historial.pagina,
      paginas: historial.paginas,
      limite: historial.limite
    }
  });
});
