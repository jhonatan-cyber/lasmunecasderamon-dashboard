import { UserService, usuarioEstaActivo } from '@/modules/identidad';
import { AppError } from '@/lib/errors/errors';

export async function administradorActual(id: string) {
  const [usuario, activo] = await Promise.all([UserService.getById(id), usuarioEstaActivo(id)]);
  if (!usuario || !activo || usuario.role?.toLowerCase() !== 'administrador') {
    throw new AppError(
      'Este MCP es exclusivo para administradores activos.',
      'SOLO_ADMINISTRADOR',
      403
    );
  }
  return { id, role: usuario.role, name: usuario.name, nick: usuario.nick };
}
