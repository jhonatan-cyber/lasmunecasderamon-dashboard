import 'server-only';
import { AuthService } from '@/modules/identidad';

export function iniciarSesion(credenciales: Parameters<typeof AuthService.login>[0], ip?: string) {
  // El login es solo autenticación: asistencia y presencia en el local son
  // decisiones que la persona registra desde dentro (`/api/attendance/register`).
  return AuthService.login(credenciales, ip);
}
