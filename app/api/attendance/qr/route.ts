import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoute } from '@/lib/api/withRoute';
import { ValidationError } from '@/lib/errors/errors';
import { issueChallenge } from '@/modules/asistencia';
import { usuarioEstaActivo } from '@/modules/identidad';

export const dynamic = 'force-dynamic';
const ChallengeSchema = z.object({ userId: z.string().min(1, 'userId es requerido') });
export const POST = withRoute(
  { auth: true, audit: true, module: 'attendance', action: 'write' },
  async (request: Request, { user }: { params: any; user: { id: string } }) => {
    const { userId } = ChallengeSchema.parse(await request.json());

    if (!(await usuarioEstaActivo(userId)))
      throw new ValidationError('Usuario no encontrado o inactivo');

    const desafio = await issueChallenge(userId, { kind: 'user', userId: String(user.id) });

    return NextResponse.json({ success: true, data: desafio });
  }
);
