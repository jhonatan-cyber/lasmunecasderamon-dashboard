import { AttendanceRegisterSchema } from '@/lib/business/schemas';
import { AttendanceRepository } from '@/lib/repositories/AttendanceRepository';

export class AttendanceService {
  static async registerAttendance(body: any, currentUser?: { id: string }) {
    // Validar el body con Zod
    const validated = AttendanceRegisterSchema.parse(body);
    
    // Delegar al repositorio para la persistencia
    return await AttendanceRepository.register(validated, currentUser);
  }
}
