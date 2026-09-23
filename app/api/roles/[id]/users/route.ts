import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { RoleService } from '@/lib/services/RoleService';

export const GET = withPublicRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const data = await RoleService.getUsersByRole(id);
    return NextResponse.json({ success: true, data });
  }
);
