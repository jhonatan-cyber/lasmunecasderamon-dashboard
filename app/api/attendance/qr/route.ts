import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoute } from '@/lib/api/withRoute';
import { ValidationError } from '@/lib/errors/errors';
import { issueChallenge } from '@/modules/asistencia';
import { usuarioEstaActivo } from '@/modules/identidad';

export const dynamic = 'force-dynamic';

const ChallengeSchema = z.object({ userId: z.string().min(1, 'userId es requerido') });

/**
 * Emite un desafío desde la pantalla de asistencia del personal (la cola del mostrador).
 *
 * Quien lo emite queda registrado y puede canjearlo por el empleado; el dueño también
 * puede hacerlo desde su teléfono. Es una capacidad del local: exige sesión con permiso
 * de escritura en asistencia, no una sesión cualquiera.
 */
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
