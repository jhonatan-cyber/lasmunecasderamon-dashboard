import {
  getUserPermissions,
  loginUser,
  logoutUser,
  resetPassword,
  cerrarTodasSesiones,
  getAuthLogs,
  checkUsersExist,
  registerFirstUser,
  checkSession,
  getSystemDateTime
} from './auth/AuthQueries';

export class AuthRepository {
  static getUserPermissions = getUserPermissions;
  static login = loginUser;
  static logout = logoutUser;
  static resetPassword = resetPassword;
  static cerrarSesiones = cerrarTodasSesiones;
  static getLogs = getAuthLogs;
  static checkUsers = checkUsersExist;
  static registerFirstUser = registerFirstUser;
  static checkSession = checkSession;
  static getSystemDateTime = getSystemDateTime;
}
