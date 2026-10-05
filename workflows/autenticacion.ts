import 'server-only';
import { AuthService } from '@/modules/identidad';
import { registrarMarcaLogin } from '@/modules/asistencia';

export function iniciarSesion(credenciales: Parameters<typeof AuthService.login>[0], ip?: string) {
  return AuthService.login(credenciales, ip, registrarMarcaLogin);
}
