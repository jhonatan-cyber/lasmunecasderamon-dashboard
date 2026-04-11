import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { ServiceRepository } from '@/lib/repositories/ServiceRepository';

export const GET = withAppAuth(async (_request: Request, { user }: { params: any; user: any }) => {
  const data = await ServiceRepository.getByUser(user.id.toString());
  return NextResponse.json({ success: true, data });
});
