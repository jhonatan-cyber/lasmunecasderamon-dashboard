import { AttendanceRegisterSchema } from '@/lib/business/schemas';
import { AttendanceRepository } from '@/lib/repositories/AttendanceRepository';

export class AttendanceService {
  static async registerAttendance(body: any, currentUser?: { id: string }, ip?: string) {
    const validated = AttendanceRegisterSchema.parse(body);
    
    return await AttendanceRepository.register(validated, currentUser, ip);
  }
}
