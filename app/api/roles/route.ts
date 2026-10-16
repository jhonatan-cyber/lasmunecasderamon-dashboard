import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { RoleService } from '@/modules/identidad';
import { RoleWriteSchema } from '@/lib/business/schemas/role';

export const GET = withPublicRoute(async () => {
  const data = await RoleService.getAll();
  return NextResponse.json({ success: true, data });
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'roles', action: 'write' },
  async (request: Request) => {
    const body = RoleWriteSchema.parse(await request.json());
    if (body.nombre.toLowerCase() === 'administrador') {
      return NextResponse.json(
        { success: false, message: 'Ese nombre de rol está reservado' },
        { status: 409 }
      );
    }
    const id = await RoleService.create(body);
    return NextResponse.json({ success: true, message: 'Role created', id }, { status: 201 });
  }
);
