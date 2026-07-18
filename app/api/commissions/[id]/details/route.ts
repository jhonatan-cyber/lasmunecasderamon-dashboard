import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { CommissionService } from '@/lib/services/CommissionService';

export const GET = withPublicRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    if (!id || id === 'undefined')
      return NextResponse.json(
        { success: false, message: 'ID de usuario es requerido' },
        { status: 400 }
      );

    const data = await CommissionService.getDetails(id);
    return NextResponse.json({ success: true, data });
  }
);
