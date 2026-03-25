import { NextResponse } from 'next/server';
import { RoleRepository } from '@/lib/repositories/RoleRepository';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const data = await RoleRepository.getById(id);
    if (!data) return NextResponse.json({ success: false, message: 'Role not found' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting role', error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const body = await request.json();
    await RoleRepository.update(id, body);
    return NextResponse.json({ success: true, message: 'Role updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error updating role', error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    await RoleRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Role deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error deleting role', error: error.message }, { status: 500 });
  }
}
