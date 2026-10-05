import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { CommissionService } from '@/modules/personal';

export const PUT = withRoute(
  { auth: true, audit: true, module: 'commissions', action: 'write' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const body = await request.json();
    await CommissionService.update(id, body);
    return NextResponse.json({ success: true, message: 'Comisión actualizada' });
  }
);

export const DELETE = withRoute(
  { auth: true, audit: true, module: 'commissions', action: 'delete' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    await CommissionService.delete(id);
    return NextResponse.json({ success: true, message: 'Comisión eliminada' });
  }
);
