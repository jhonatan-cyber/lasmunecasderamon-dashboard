import { AttendanceRegisterSchema } from '@/lib/business/schemas';
import { AttendanceRepository } from '@/lib/repositories/AttendanceRepository';
import { z } from 'zod';

type AttendanceRegisterInput = z.input<typeof AttendanceRegisterSchema>;

export class AttendanceService {
  static async registerAttendance(body: AttendanceRegisterInput, currentUser?: { id: string }, ip?: string) {
    const validated = AttendanceRegisterSchema.parse(body);
    return await AttendanceRepository.register(validated, currentUser, ip);
  }
}
