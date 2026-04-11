import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { GratificacionRepository } from '@/lib/repositories/GratificacionRepository';

export const GET = withAppAuth(async (_request: Request, { user }: { params: any; user: any }) => {
  const data = await GratificacionRepository.getAll(user.id);
  return NextResponse.json(data);
});
