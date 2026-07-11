import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { OrderService } from '@/lib/services/OrderService';

export const GET = withAppAuth(async (_request: Request, { user }: { params: any; user: any }) => {
  const data = await OrderService.getByUser(user.id.toString());
  return NextResponse.json({ success: true, data });
});
