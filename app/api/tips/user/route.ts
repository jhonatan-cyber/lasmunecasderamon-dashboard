import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { TipRepository } from '@/lib/repositories/TipRepository';

export const GET = withAppAuth(async (_request: Request, { user }: { params: any; user: any }) => {
  const data = await TipRepository.getByUser(user.id.toString());
  return NextResponse.json({ success: true, data });
});
