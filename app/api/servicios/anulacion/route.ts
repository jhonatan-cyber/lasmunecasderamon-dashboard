import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { ServiceRepository } from '@/lib/repositories/ServiceRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const POST = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  if (body.requestId) {
    // Process
    await ServiceRepository.processAnulacion(body.requestId, user.id.toString(), body.status);
    return NextResponse.json({ success: true, message: 'Solicitud procesada' });
  } else {
    // Request
    const id = await ServiceRepository.requestAnulacion(
      body.servicioId,
      body.motivo,
      user.id.toString()
    );
    return NextResponse.json({ success: true, id });
  }
});
