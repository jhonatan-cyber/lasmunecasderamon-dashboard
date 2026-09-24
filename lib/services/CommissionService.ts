import { CommissionCreateSchema, CommissionSchema } from '@/lib/business/schemas';
import { CommissionRepository } from '@/lib/repositories/CommissionRepository';
import { z } from 'zod';

type CommissionCreateInput = z.input<typeof CommissionCreateSchema>;
type CommissionUpdateInput = z.input<typeof CommissionSchema>;

export class CommissionService {
  static async summary() {
    return await CommissionRepository.summary();
  }

  static async list(params?: { status?: string; employeeId?: string; search?: string }) {
    return await CommissionRepository.list(params || {});
  }

  static async create(data: CommissionCreateInput) {
    const validated = CommissionCreateSchema.parse(data);
    return await CommissionRepository.create(validated);
  }

  static async getDetails(usuarioId: string) {
    return await CommissionRepository.getDetails(usuarioId);
  }

  static async update(id: string, data: CommissionUpdateInput) {
    const validated = CommissionSchema.partial()
      .omit({
        id: true,
        fecha_crea: true,
        anfitriona_nombre: true,
        nick: true,
        venta_monto: true,
        servicio_monto: true
      })
      .parse(data);
    return await CommissionRepository.update(id, validated);
  }

  static async delete(id: string) {
    return await CommissionRepository.delete(id);
  }
}
