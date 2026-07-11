import { AuditRepository } from '@/lib/repositories/AuditRepository';
import type { AuditLog } from '@/lib/repositories/AuditRepository';
import type { TransactionQuery } from '@/lib/database/db';

export class AuditService {
  static async log(data: AuditLog, trx?: TransactionQuery) {
    return await AuditRepository.log(data, trx);
  }

  static async getLatest(limit: number = 100) {
    return await AuditRepository.getLatest(limit);
  }
}
