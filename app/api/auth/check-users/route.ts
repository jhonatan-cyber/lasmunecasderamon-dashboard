import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { AuthService } from '@/lib/services/AuthService';

export const GET = withAppApiWrapper(async () => {
  const hasUsers = await AuthService.checkUsers();
  return NextResponse.json({ success: true, hasUsers });
});
