/** Clave de una intencion de escritura del dashboard, independiente de la cola offline. */
export const REGISTRATION_HEADER = 'x-registration-key';

export const isRegistrationMethod = (method: string) =>
  ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
