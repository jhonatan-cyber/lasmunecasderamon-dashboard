import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { UserService } from '@/lib/services/UserService';

export const PATCH = withPublicRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const { status } = await request.json();
    await UserService.updateServiceStatus(id, status);
    return NextResponse.json({ success: true, message: 'Status updated' });
  }
);
