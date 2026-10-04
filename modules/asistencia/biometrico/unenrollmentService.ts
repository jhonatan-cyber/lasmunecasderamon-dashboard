import { withTransaction } from '@/lib/database/db';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { NotFoundError } from '@/lib/errors/errors';

export async function desenrolarUsuario(usuarioId: string) {
  const usuario = await UserRepository.getById(usuarioId);
  if (!usuario) throw new NotFoundError('Usuario', usuarioId);
  await withTransaction(async trx => {
    await trx('DELETE FROM biometric_plantillas WHERE usuario_id = ?', [usuarioId]);
    await trx(
      'UPDATE usuarios SET biometrico_facial = 0, biometrico_huella = 0 WHERE id_usuario = ?',
      [usuarioId]
    );
  });
  return { ok: true, mensaje: 'Usuario desenrolado del sistema correctamente.' };
}
