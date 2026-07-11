import { AttendanceRegisterSchema } from '@/lib/business/schemas';
import { AttendanceRepository } from '@/lib/repositories/AttendanceRepository';
import { z } from 'zod';

type AttendanceRegisterInput = z.input<typeof AttendanceRegisterSchema>;

export class AttendanceService {
  static async registerAttendance(
    body: AttendanceRegisterInput,
    currentUser?: { id: string },
    ip?: string
  ) {
    const validated = AttendanceRegisterSchema.parse(body);
    return await AttendanceRepository.register(validated, currentUser, ip);
  }

  static async getByUser(userId: string, tipo?: string, startDate?: string, endDate?: string) {
    return await AttendanceRepository.getByUser(userId, tipo, startDate, endDate);
  }

  static async getByDates(userId: string, dates: string[]) {
    return await AttendanceRepository.getByDates(userId, dates);
  }

  static async getHoy() {
    return await AttendanceRepository.getHoy();
  }

  static async selfRegister(user: { id: string }, ip?: string) {
    return await AttendanceRepository.selfRegister(user, ip);
  }

  static async getSummary() {
    return await AttendanceRepository.getSummary();
  }

  static async registerManual(
    usuario_id: string,
    fecha: string,
    hora: string,
    estado: string,
    user: any
  ) {
    return await AttendanceRepository.registerManual(usuario_id, fecha, hora, estado, user);
  }

  static async getStats() {
    return await AttendanceRepository.getStats();
  }
}
