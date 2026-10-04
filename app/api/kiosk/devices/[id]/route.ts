import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoute } from '@/lib/api/withRoute';
import { revokeDevice } from '@/modules/asistencia';

export const DELETE = withRoute(
  { auth: true, access: 'administrator', audit: true },
  async (_request, { params }) => {
    const { id } = await params;
    await revokeDevice(z.uuid().parse(id));
    return NextResponse.json({ success: true });
  }
);
