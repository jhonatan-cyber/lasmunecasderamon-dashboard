import { z } from 'zod';
import { ExtraHoursSchema } from '@/lib/business/schemas';
import { OvertimeRepository } from '@/lib/repositories/OvertimeRepository';

type ExtraHoursInput = z.input<typeof ExtraHoursSchema>;

export class OvertimeService {
  static async getAll(userId?: string, startDate?: string, endDate?: string) {
    return await OvertimeRepository.getAll(userId, startDate, endDate);
  }

  static async getByUser(userId: string, tipo?: string, startDate?: string, endDate?: string) {
    return await OvertimeRepository.getByUser(userId, tipo, startDate, endDate);
  }

  static async getByDates(userId: string, dates: string[]) {
    return await OvertimeRepository.getByDates(userId, dates);
  }

  static async create(data: ExtraHoursInput & { monto: number; device_date?: string }) {
    const validated = ExtraHoursSchema.parse(data);
    return await OvertimeRepository.create({
      usuario_id: validated.usuario_id,
      hora: validated.hora,
      monto: data.monto,
      device_date: data.device_date
    });
  }

  static async update(id: string, data: Partial<{ hora: number; monto: number; estado: number }>) {
    const schema = z
      .object({
        hora: z.number().int().positive('La hora debe ser válida').optional(),
        monto: z.number().min(0, 'El monto no puede ser negativo').optional(),
        estado: z.number().int().optional()
      })
      .partial();
    const validated = schema.parse(data);
    return await OvertimeRepository.update(id, validated);
  }

  static async delete(id: string) {
    return await OvertimeRepository.delete(id);
  }
}
