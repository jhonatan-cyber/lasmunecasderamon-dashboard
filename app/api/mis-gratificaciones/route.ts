import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { GratificacionRepository } from '@/lib/repositories/GratificacionRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(async () => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const gratificaciones = await GratificacionRepository.getAll(user.id.toString());

  return NextResponse.json({ success: true, data: gratificaciones });
});
