import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';

// Impide que clientes antiguos vuelvan a registrar usuarios en el lector.
// El guard va inline en cada export: la matriz de autorización lee el
// `withRoute({...})` directamente del `export const MÉTODO`.
const retirado = async () =>
  NextResponse.json(
    {
      success: false,
      message:
        'El enrolamiento se guarda en el sistema. Usar Capturar y guardar en la ficha del usuario.'
    },
    { status: 410 }
  );

export const POST = withRoute(
  { auth: true, module: 'users', action: 'write', audit: true },
  retirado
);
export const PUT = withRoute(
  { auth: true, module: 'users', action: 'write', audit: true },
  retirado
);
export const DELETE = withRoute(
  { auth: true, module: 'users', action: 'write', audit: true },
  retirado
);
