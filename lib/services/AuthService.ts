import { AuthRepository } from '@/lib/repositories/AuthRepository';

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
