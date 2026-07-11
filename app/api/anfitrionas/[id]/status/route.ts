import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { UserService } from '@/lib/services/UserService';

export const PATCH = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const { status } = await request.json();
    await UserService.updateServiceStatus(id, status);
    return NextResponse.json({ success: true, message: 'Status updated' });
  }
);
