import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { UserService } from '@/lib/services/UserService';

export const GET = withAppApiWrapper(async () => {
  const data = await UserService.getAvailableAnfitrionas();
  return NextResponse.json({ success: true, data });
});
