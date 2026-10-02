import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';

export const POST = withRoute({ auth: true, access: 'administrator', audit: true }, async () =>
  NextResponse.json(
    {
      success: false,
      message: 'Las plantillas se guardan en el sistema. Ya no se envian usuarios al lector.'
    },
    { status: 410 }
  )
);
