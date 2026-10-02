import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';

// Impide que clientes antiguos vuelvan a registrar usuarios en el lector.
const retired = withRoute({ auth: true, module: 'users', action: 'write', audit: true }, async () =>
  NextResponse.json(
    {
      success: false,
      message:
        'El enrolamiento se guarda en el sistema. Usar Capturar y guardar en la ficha del usuario.'
    },
    { status: 410 }
  )
);
export const POST = retired;
export const PUT = retired;
export const DELETE = retired;
