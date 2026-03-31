import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { TipRepository } from '@/lib/repositories/TipRepository';

export const GET = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    
    if (!id || id === 'undefined') {
        return NextResponse.json({ success: false, message: 'ID inválido' }, { status: 400 });
    }

    const data = await TipRepository.getByIdWithParticipants(id);
    if (!data)
      return NextResponse.json({ success: false, message: 'Propina no encontrada' }, { status: 404 });
    
    return NextResponse.json({ success: true, data });
  }
);
