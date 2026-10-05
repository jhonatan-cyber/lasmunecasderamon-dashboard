import { CommissionCreateSchema, CommissionSchema } from '@/lib/business/schemas';
import {
  resumirComisiones,
  listarComisiones,
  crearComision,
  detalleComisionesDeUsuario,
  actualizarComision,
  anularComision
} from '@/modules/personal/conceptos/servicio';
import { z } from 'zod';

type CommissionCreateInput = z.input<typeof CommissionCreateSchema>;
type CommissionUpdateInput = z.input<typeof CommissionSchema>;

export class CommissionService {
  static async summary() {
    return await resumirComisiones();
  }

  static async list(params?: { status?: string; employeeId?: string; search?: string }) {
    return await listarComisiones(params || {});
  }

  static async create(data: CommissionCreateInput) {
    const validated = CommissionCreateSchema.parse(data);
    return await crearComision(validated);
  }

  static async getDetails(usuarioId: string) {
    return await detalleComisionesDeUsuario(usuarioId);
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
    await actualizarComision(id, validated);
  }

  static async delete(id: string) {
    return await anularComision(id);
  }
}
