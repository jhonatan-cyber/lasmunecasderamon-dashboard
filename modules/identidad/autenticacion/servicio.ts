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

import * as tokens from './sesionTokensRepositorio';
export function obtenerEstadoSesionToken(usuarioId: string) {
  return tokens.obtenerEstadoSesionToken(usuarioId);
}
export function revocarSesionesUsuario(usuarioId: string) {
  return tokens.revocarSesionesUsuario(usuarioId);
}

/** Herramienta de pruebas: lista y fuerza la presencia del personal en el local. */
import * as presencia from './presenciaRepositorio';
export function listarPersonalConPresencia() {
  return presencia.listarPersonalConPresencia();
}
export function fijarPresenciaLocal(usuarioId: string, presente: boolean) {
  return presencia.fijarPresenciaLocal(usuarioId, presente);
}
export function fijarPresenciaDeTodoElPersonal(presente: boolean) {
  return presencia.fijarPresenciaDeTodoElPersonal(presente);
}
export type { PersonalPresencia } from './presenciaRepositorio';
