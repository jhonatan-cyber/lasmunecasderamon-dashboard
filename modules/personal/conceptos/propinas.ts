import { TipRegisterSchema } from '@/lib/business/schemas';
import {
  registrarPropinaVenta,
  leerResumenPropinas,
  leerPropinasDeUsuario,
  leerDetallePropinas,
  obtenerPropinaConParticipantes
} from '@/modules/personal/conceptos/servicio';
import { enUnaUnidad } from '@/lib/transaccion/contrato';
import { z } from 'zod';

type TipRegisterInput = z.input<typeof TipRegisterSchema>;

export class TipService {
  static async register(body: TipRegisterInput) {
    const validated = TipRegisterSchema.parse(body);
    return await enUnaUnidad(unidad =>
      unidad.ejecutar(contexto => registrarPropinaVenta(validated, contexto))
    );
  }

  static async getSummary(isAdmin: boolean, userId: string, cajaActiva: boolean) {
    return await leerResumenPropinas(isAdmin, userId, cajaActiva);
  }

  static async getByUser(userId: string) {
    return await leerPropinasDeUsuario(userId);
  }

  static async getDetails(usuario_id: string, startDate?: string, endDate?: string) {
    return await leerDetallePropinas(usuario_id, startDate, endDate);
  }

  static async getByIdWithParticipants(id: string) {
    return await obtenerPropinaConParticipantes(id);
  }
}
