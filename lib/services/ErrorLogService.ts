import { ErrorLogRepository } from '@/lib/repositories/ErrorLogRepository';

export class ErrorLogService {
  static async getAll() {
    return await ErrorLogRepository.getAll();
  }

  static async log(data: {
    endpoint: string;
    error_message: string;
    stack_trace?: string;
    request_body?: string;
  }) {
    return await ErrorLogRepository.log(data);
  }
}
