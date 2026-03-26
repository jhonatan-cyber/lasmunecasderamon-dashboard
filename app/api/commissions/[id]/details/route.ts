import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { CommissionRepository } from '@/lib/repositories/CommissionRepository';

export const GET = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    if (!id || id === 'undefined')
      return NextResponse.json(
        { success: false, message: 'ID de usuario es requerido' },
        { status: 400 }
      );

    const data = await CommissionRepository.getDetails(id);
    return NextResponse.json({ success: true, data });
  }
);
