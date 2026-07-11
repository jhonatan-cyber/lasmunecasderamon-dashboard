import { TimerRepository } from '@/lib/repositories/TimerRepository';

export class TimerService {
  static async getActive() {
    return await TimerRepository.getActive();
  }

  static async runAutoCleanup() {
    return await TimerRepository.runAutoCleanup();
  }
}
