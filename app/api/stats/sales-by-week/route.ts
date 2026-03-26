import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { StatsRepository } from '@/lib/repositories/StatsRepository';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get('offset') || '0');

  const data = await StatsRepository.getSalesByWeek(offset);
  return NextResponse.json({ success: true, data });
});
