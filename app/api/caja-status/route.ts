import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { StatsRepository } from '@/lib/repositories/StatsRepository';

export const GET = withAppApiWrapper(async () => {
  const stats = await StatsRepository.getCajaGeneralStats();
  return NextResponse.json({ success: true, data: stats });
});
