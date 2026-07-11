import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { CommissionService } from '@/lib/services/CommissionService';

export const PUT = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const body = await request.json();
    await CommissionService.update(id, body);
    return NextResponse.json({ success: true, message: 'Comisión actualizada' });
  }
);

export const DELETE = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    await CommissionService.delete(id);
    return NextResponse.json({ success: true, message: 'Comisión eliminada' });
  }
);
