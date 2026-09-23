import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoute } from '@/lib/api/withRoute';
import { query } from '@/lib/database/db';
import { ValidationError } from '@/lib/errors/errors';
import { issueChallenge } from '@/lib/kiosk/attendanceChallenges';

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

    const usuarios = await query<any[]>(
      'SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND estado = 1',
      [userId]
    );
    if (usuarios.length === 0) throw new ValidationError('Usuario no encontrado o inactivo');

    const desafio = await issueChallenge(userId, { kind: 'user', userId: String(user.id) });

    return NextResponse.json({ success: true, data: desafio });
  }
);
