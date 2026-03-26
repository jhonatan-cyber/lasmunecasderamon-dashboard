import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { UserRepository } from '@/lib/repositories/UserRepository';

export const PATCH = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const { status } = await request.json();
    await UserRepository.updateServiceStatus(id, status);
    return NextResponse.json({ success: true, message: 'Status updated' });
  }
);
