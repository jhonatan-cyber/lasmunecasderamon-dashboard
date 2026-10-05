import { AuthRepository } from '@/modules/identidad/autenticacion/repositorio';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';
import * as sesiones from './sesionesRepositorio';
export function cerrarSesionesPorCierreCaja(contexto: ContextoOperacion) {
  return sesiones.cerrarSesionesPorCierreCaja(contexto);
}
export function marcarPresenciaLocal(...args: Parameters<typeof sesiones.marcarPresenciaLocal>) {
  return sesiones.marcarPresenciaLocal(...args);
}
export function asegurarSesionPresente(
  ...args: Parameters<typeof sesiones.asegurarSesionPresente>
) {
  return sesiones.asegurarSesionPresente(...args);
}

export class AuthService {
  static getUserPermissions = AuthRepository.getUserPermissions;
  static login = AuthRepository.login;
  static logout = AuthRepository.logout;
  static resetPassword = AuthRepository.resetPassword;
  static cerrarSesiones = AuthRepository.cerrarSesiones;
  static getLogs = AuthRepository.getLogs;
  static checkUsers = AuthRepository.checkUsers;
  static registerFirstUser = AuthRepository.registerFirstUser;
  static checkSession = AuthRepository.checkSession;
  static getSystemDateTime = AuthRepository.getSystemDateTime;
  static clearForcePasswordChange = AuthRepository.clearForcePasswordChange;
}
