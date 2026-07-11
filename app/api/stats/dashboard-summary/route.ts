import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { StatsService } from '@/lib/services/StatsService';

export const GET = withAppAuth(async (_request: Request, { user }: { params: any; user: any }) => {
  const data = await StatsService.getUserDashboardSummary(user.id.toString(), user.role);
  return NextResponse.json({ success: true, data });
});
