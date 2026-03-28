import { AnticipoRequestSchema } from '@/lib/business/schemas';
import { AnticipoRepository } from '@/lib/repositories/AnticipoRepository';

export class AnticipoService {

  static async requestAnticipo(usuario_id: string, body: any) {
    const validated = AnticipoRequestSchema.parse(body);
    return await AnticipoRepository.request(usuario_id, validated.monto, validated.motivo, validated.device_date);
  }


  static async grantAnticipo(usuario_id: string, monto: number, motivo?: string, device_date?: string) {
    if (monto <= 0) throw new Error('El monto debe ser positivo');
    return await AnticipoRepository.grant(usuario_id, monto, motivo, device_date);
  }
}
