import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { StatsRepository } from '@/lib/repositories/StatsRepository';

export const GET = withAppAuth(async (_request: Request, { user }: { params: any; user: any }) => {
  const data = await StatsRepository.getUserDashboardSummary(user.id.toString(), user.role);
  return NextResponse.json({ success: true, data });
});
