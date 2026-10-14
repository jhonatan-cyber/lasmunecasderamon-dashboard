import { AppError } from '@/lib/errors/errors';

export function assertServiceMutationAllowed(role: string): void {
  if ((role || '').trim().toLowerCase() === 'anfitriona') {
    throw new AppError('Las anfitrionas solo pueden consultar sus servicios', 'FORBIDDEN', 403);
  }
}
