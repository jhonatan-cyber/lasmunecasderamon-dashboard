import { NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database/db';
import { ValidationError } from '@/lib/errors/errors';
import { issueChallenge } from '@/modules/asistencia';
import { getKioskDevice } from '@/modules/asistencia';

export const dynamic = 'force-dynamic';

const ChallengeSchema = z.object({ userId: z.string().min(1, 'userId es requerido') });

/**
 * Emite un desafío de asistencia para una persona desde la pantalla del kiosko.
 *
 * Solo una pantalla provisionada puede pedirlo: si este endpoint fuera público, el
 * desafío se pediría desde cualquier lado y la asistencia no probaría presencia. El
 * token crudo se devuelve una sola vez, para dibujarlo como QR; en la base queda su hash.
 */
export async function POST(request: Request) {
  const deviceId = await getKioskDevice();
  if (!deviceId) {
    return NextResponse.json(
      { success: false, message: 'Pantalla no vinculada', code: 'KIOSK_NOT_LINKED' },
      { status: 401 }
    );
  }

  const { userId } = ChallengeSchema.parse(await request.json());

  const usuarios = await query<any[]>(
    'SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND estado = 1',
    [userId]
  );
  if (usuarios.length === 0) throw new ValidationError('Usuario no encontrado o inactivo');

  const desafio = await issueChallenge(userId, { kind: 'kiosk', deviceId });

  return NextResponse.json({ success: true, data: desafio });
}
