import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { TipService } from '@/lib/services/TipService';

export const GET = withAppAuth(async (_request: Request, { user }: { params: any; user: any }) => {
  const data = await TipService.getByUser(user.id.toString());
  return NextResponse.json({ success: true, data });
});
