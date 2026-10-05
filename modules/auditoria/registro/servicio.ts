import { AuditRepository } from './repositorio';
import type { AuditLog } from '../contracts';
import type { ContextoOperacion } from '@/lib/transaccion/contrato';

export class AuditService {
  static async log(data: AuditLog, contexto?: ContextoOperacion) {
    return contexto ? AuditRepository.log(data, contexto) : AuditRepository.log(data);
  }

  static async getLatest(limit: number = 100) {
    return await AuditRepository.getLatest(limit);
  }
}
