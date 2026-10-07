import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { consultarRankingAsistencia } from '@/modules/asistencia';
import { z } from 'zod';

const filtros = z
  .object({
    startDate: z.iso.date().optional(),
    endDate: z.iso.date().optional()
  })
  .refine(a => !a.startDate || !a.endDate || a.startDate <= a.endDate, {
    message: 'La fecha inicial debe ser anterior o igual a la final'
  });

export const GET = withRoute(
  { auth: true, module: 'attendance', action: 'read' },
  async (request: Request) => {
    const search = new URL(request.url).searchParams;
    const parsed = filtros.safeParse({
      startDate: search.get('startDate') ?? undefined,
      endDate: search.get('endDate') ?? undefined
    });
    if (!parsed.success)
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0].message },
        { status: 400 }
      );
    const data = await consultarRankingAsistencia(parsed.data.startDate, parsed.data.endDate);
    return NextResponse.json({ success: true, data });
  }
);
