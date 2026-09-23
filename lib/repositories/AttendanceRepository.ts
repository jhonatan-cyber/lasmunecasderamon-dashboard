import {
  getAttendanceSummary,
  getAttendanceStats,
  registerAttendance,
  getAttendanceByUser,
  getAttendanceHoy,
  getAttendanceByDates,
  registerAttendanceManual,
  selfRegisterAttendance,
  registerMasivoHoy
} from './attendance/AttendanceQueries';

export class AttendanceRepository {
  static getSummary = getAttendanceSummary;
  static getStats = getAttendanceStats;
  static register = registerAttendance;
  static getByUser = getAttendanceByUser;
  static getHoy = getAttendanceHoy;
  static getByDates = getAttendanceByDates;
  static registerManual = registerAttendanceManual;
  static selfRegister = selfRegisterAttendance;
  static registerMasivoHoy = registerMasivoHoy;
}
