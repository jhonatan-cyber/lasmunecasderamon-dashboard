import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { AnticipoRepository } from '@/lib/repositories/AnticipoRepository';

export const GET = withAppAuth(async (_request: Request, { user }: { params: any; user: any }) => {
  const data = await AnticipoRepository.getByUser(user.id.toString());
  return NextResponse.json({ success: true, data });
});
