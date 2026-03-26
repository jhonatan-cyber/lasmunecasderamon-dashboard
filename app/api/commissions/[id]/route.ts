import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { CommissionRepository } from '@/lib/repositories/CommissionRepository';

export const PUT = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const body = await request.json();
    await CommissionRepository.update(id, body);
    return NextResponse.json({ success: true, message: 'Comisión actualizada' });
  }
);

export const DELETE = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    await CommissionRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Comisión eliminada' });
  }
);
