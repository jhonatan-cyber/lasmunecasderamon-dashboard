import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { ErrorLogService } from '@/lib/services/ErrorLogService';

// Los registros incluyen stack traces y request bodies de toda la aplicacion,
// por eso solo el administrador los puede consultar.
export const GET = withRoute({ auth: true, access: 'administrator' }, async () => {
  const data = await ErrorLogService.getAll();
  return NextResponse.json({ success: true, data });
});

export const POST = withPublicRoute(async (request: Request) => {
  const body = await request.json();
  await ErrorLogService.log(body);
  return NextResponse.json({ success: true });
});
