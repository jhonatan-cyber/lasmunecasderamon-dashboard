import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { AccountService } from '@/modules/operacion';

export const PATCH = withRoute(
  { auth: true, audit: true, module: 'finances', action: 'write' },
  async (_request: Request, { params, user }) => {
    const id = (await params).id;
    const data = await AccountService.stopTimer(id, user.id.toString());
    return NextResponse.json({ success: true, message: 'Temporizador finalizado', data });
  }
);
