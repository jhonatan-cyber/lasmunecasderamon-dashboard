import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { NotificationService } from '@/lib/services/NotificationService';

export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (_request: Request, { user }: { params: any; user: any }) => {
    const count = await NotificationService.getPendingCount(user.id.toString());
    return NextResponse.json({ success: true, data: count });
  }
);
