import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { StatsRepository } from '@/lib/repositories/StatsRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
  }

  const data = await StatsRepository.getUserDashboardSummary(user.id.toString(), user.role);

  return NextResponse.json({
    success: true,
    data
  });
});
