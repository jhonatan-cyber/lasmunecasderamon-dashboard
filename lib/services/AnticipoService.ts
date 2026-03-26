import { AnticipoRequestSchema } from '@/lib/business/schemas';
import { AnticipoRepository } from '@/lib/repositories/AnticipoRepository';

export class AnticipoService {
  /**
   * Procesa la solicitud de un anticipo por parte de un usuario.
   */
  static async requestAnticipo(usuario_id: string, body: any) {
    const validated = AnticipoRequestSchema.parse(body);
    return await AnticipoRepository.request(usuario_id, validated.monto, validated.motivo);
  }

  /**
   * Concesión directa de un anticipo (para caja).
   */
  static async grantAnticipo(usuario_id: string, monto: number) {
    if (monto <= 0) throw new Error('El monto debe ser positivo');
    return await AnticipoRepository.grant(usuario_id, monto);
  }
}
