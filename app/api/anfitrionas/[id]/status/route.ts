import { NextResponse } from 'next/server';
import { UserRepository } from '@/lib/repositories/UserRepository';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const { status } = await request.json();
    await UserRepository.updateServiceStatus(id, status);
    return NextResponse.json({ success: true, message: 'Status updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error updating status', error: error.message }, { status: 400 });
  }
}
