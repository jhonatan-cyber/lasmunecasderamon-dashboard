import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { CommissionRepository } from '@/lib/repositories/CommissionRepository';

export const GET = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const id = (await params).id;
      if (!id) {
         return NextResponse.json({ success: false, message: 'ID de usuario requerido' }, { status: 400 });
      }
      const data = await CommissionRepository.getDetails(id);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[API Commissions Detalle] Error:', error);
      return NextResponse.json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Error al obtener detalles de comisiones' 
      }, { status: 500 });
    }
  }
);
