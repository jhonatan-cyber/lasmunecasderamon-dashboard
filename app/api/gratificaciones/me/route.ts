import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { GratificacionService } from '@/lib/services/GratificacionService';

export const GET = withAppAuth(async (_request: Request, { user }: { params: any; user: any }) => {
  const data = await GratificacionService.getAll(user.id);
  return NextResponse.json(data);
});
