import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { obtenerHabitacionActivaDeAnfitrionas } from '@/modules/ventas';

export const POST = withPublicRoute(async (request: Request) => {
  const { anfitrionasIds } = await request.json();
  if (!anfitrionasIds || !Array.isArray(anfitrionasIds) || anfitrionasIds.length === 0) {
    return NextResponse.json({ success: true, hasActiveRoom: false });
  }

  const [habitacion] = await obtenerHabitacionActivaDeAnfitrionas(anfitrionasIds);

  if (habitacion) {
    return NextResponse.json({
      success: true,
      hasActiveRoom: true,
      data: habitacion
    });
  }

  return NextResponse.json({ success: true, hasActiveRoom: false });
});
