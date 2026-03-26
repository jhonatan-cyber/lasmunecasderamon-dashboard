import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { AttendanceRepository } from '@/lib/repositories/AttendanceRepository';

export const GET = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    if (!id) return NextResponse.json({ success: false, message: 'Falta el id' }, { status: 400 });

    const data = await AttendanceRepository.getByUser(id, 'detalle');
    return NextResponse.json({ success: true, data });
  }
);
