import { ServiceRequestRepository } from '@/modules/operacion/solicitudes/repositorio';

export class ServiceRequestService {
  static async getAll(estado?: string) {
    return await ServiceRequestRepository.getAll(estado);
  }

  static async create(data: any, solicitadoPor: string) {
    return await ServiceRequestRepository.create(data, solicitadoPor);
  }

  static async getPendingCount() {
    return await ServiceRequestRepository.getPendingCount();
  }

  static async getPendingServiceRequests(limit: number = 5) {
    return await ServiceRequestRepository.getPendingServiceRequests(limit);
  }

  static async delete(id: string) {
    return await ServiceRequestRepository.delete(id);
  }

  static async getById(id: string) {
    return await ServiceRequestRepository.getById(id);
  }

  static async approve(id: string, processedBy: string, habitacionId?: string, montoEsperado?: number) {
    return await ServiceRequestRepository.approve(id, processedBy, habitacionId, montoEsperado);
  }

  static async reject(id: string, processedBy: string, motivoRechazo: string, montoEsperado?: number) {
    return await ServiceRequestRepository.reject(id, processedBy, motivoRechazo, montoEsperado);
  }
}
