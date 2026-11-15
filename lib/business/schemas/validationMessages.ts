import { z } from 'zod';

// ─── Mensajes centralizados de validación ──────────────────────────────
// Usar estos mensajes en todos los schemas para mantener consistencia
// en los mensajes de error que recibe el frontend.

export const VALIDATION_MESSAGES = {
  // Campos requeridos
  required: 'El campo es requerido',
  requiredField: (field: string) => `${field} es requerido`,

  // Validaciones de longitud
  min: (field: string, min: number) => `${field} debe tener al menos ${min} caracter${min > 1 ? 'es' : ''}`,
  max: (field: string, max: number) => `${field} no puede exceder ${max} caracteres`,

  // Validaciones numéricas
  positive: 'El valor debe ser positivo',
  positiveOrZero: 'El valor debe ser mayor o igual a cero',
  integer: 'El valor debe ser un número entero',
  maxAmount: (max: number) => `El monto no puede exceder ${max.toLocaleString('es-CL')}`,
  decimalPlaces: (max: number) => `No puede tener más de ${max} decimales`,
  minNumber: (min: number) => `El valor debe ser al menos ${min}`,
  maxNumber: (max: number) => `El valor no puede exceder ${max}`,

  // Validaciones de formato
  invalidEmail: 'El correo electrónico no es válido',
  invalidPhone: 'El teléfono no es válido',
  invalidRun: 'El RUN no es válido',
  invalidDate: 'La fecha no es válida',
  invalidDateFormat: 'El formato de fecha debe ser YYYY-MM-DD',
  invalidUrl: 'La URL no es válida',
  invalidIp: 'La dirección IP no es válida',

  // Validaciones de negocio
  atLeastOne: 'Al menos un campo debe ser proporcionado',
  invalidEnum: (field: string, values: string[]) => `${field} debe ser uno de: ${values.join(', ')}`,
  unique: (field: string) => `${field} ya existe`,

  // Validaciones de arrays
  minItems: (min: number) => `Debe haber al menos ${min} elemento${min > 1 ? 's' : ''}`,
  maxItems: (max: number) => `No puede haber más de ${max} elementos`,

  // ─── Mensajes de negocio ──────────────────────────────────────────────
  caja: {
    noAbierta: 'La caja no está abierta',
    yaAbierta: 'Ya hay una caja abierta',
    sinMovimientos: 'No hay movimientos para cerrar la caja',
    cierreEnProceso: 'Ya hay un cierre de caja en proceso',
    montoInsuficiente: 'El monto en caja es insuficiente',
  },
  venta: {
    yaCobrada: 'La venta ya fue cobrada',
    noEncontrada: 'La venta no fue encontrada',
    detallesRequeridos: 'Al menos un detalle de venta es requerido',
    productoNoDisponible: 'El producto no está disponible',
    stockInsuficiente: 'Stock insuficiente para el producto',
    metodoPagoInvalido: 'El método de pago no es válido',
    baucherRequerido: 'El pago con transferencia requiere foto del baucher',
  },
  servicio: {
    habitacionOcupada: 'La habitación ya está ocupada',
    habitacionNoDisponible: 'La habitación no está disponible',
    tiempoMinimo: 'El tiempo mínimo de servicio no se cumple',
    sinAnfitriona: 'Se requiere al menos una anfitriona',
  },
  cuenta: {
    noEncontrada: 'La cuenta no fue encontrada',
    yaCobrada: 'La cuenta ya fue cobrada',
    sinDetalles: 'La cuenta no tiene detalles para cobrar',
    habitacionRequerida: 'Se requiere seleccionar una habitación',
  },
  pedido: {
    noEncontrado: 'El pedido no fue encontrado',
    yaProcesado: 'El pedido ya fue procesado',
    detallesRequeridos: 'Al menos un detalle de pedido es requerido',
  },
  usuario: {
    yaExiste: 'Ya existe un usuario con ese correo',
    noEncontrado: 'El usuario no fue encontrado',
    sinPermisos: 'El usuario no tiene los permisos requeridos',
    inactivo: 'El usuario está inactivo',
    credencialesInvalidas: 'Las credenciales son incorrectas',
    sesionExpirada: 'La sesión ha expirado',
  },
  producto: {
    noEncontrado: 'El producto no fue encontrado',
    yaExiste: 'Ya existe un producto con ese nombre',
    sinPresentaciones: 'El producto no tiene presentaciones',
    stockInvalido: 'El stock no puede ser negativo',
  },
  anticipo: {
    montoMaximo: 'El monto excede el máximo permitido',
    sinSaldo: 'No hay saldo disponible para anticipo',
    yaProcesado: 'El anticipo ya fue procesado',
  },
  gratificacion: {
    montoInvalido: 'El monto de la gratificación debe ser positivo',
    usuarioRequerido: 'Se requiere seleccionar un usuario',
  },
  permiso: {
    yaExiste: 'Ya existe un permiso con ese nombre',
    noEncontrado: 'El permiso no fue encontrado',
  },
  rol: {
    yaExiste: 'Ya existe un rol con ese nombre',
    noEncontrado: 'El rol no fue encontrado',
    noEliminable: 'No se puede eliminar un rol con usuarios asignados',
  },
  horaExtra: {
    yaRegistrada: 'Ya hay hora extra registrada para ese período',
    fechaPasada: 'No se puede registrar hora extra para fecha pasada',
  },
  reserva: {
    quinchoOcupado: 'El quincho ya está reservado en ese horario',
    horarioInvalido: 'El horario de reserva no es válido',
    fechaMinima: 'Se requiere reservar con al menos 1 hora de anticipación',
  },
  asistencia: {
    yaRegistrada: 'Ya tienes asistencia registrada hoy',
    codigoInvalido: 'El código QR no es válido',
    fueraHorario: 'No estás en horario de marcaje',
  },
  propina: {
    montoInvalido: 'El monto de la propina debe ser positivo',
    ventaRequerida: 'Se requiere una venta para asignar propina',
  },
  retiro: {
    montoInvalido: 'El monto del retiro debe ser positivo',
    sinSaldo: 'No hay suficiente saldo en caja',
    motivoRequerido: 'Se requiere un motivo para el retiro',
  },
  anulacion: {
    noAnulable: 'Este registro no puede ser anulado',
    yaAnulado: 'Este registro ya fue anulado',
    motivoRequerido: 'Se requiere un motivo para la anulación',
    autorizadoRequerido: 'Se requiere autorización para anular',
  },
} as const;

// ─── Helpers reutilizables para schemas ─────────────────────────────────

/**
 * Schema de monto monetario: acepta string o number, valida positivo y 2 decimales.
 * Transforma a number con 2 decimales.
 */
export const montoSchema = (params?: { max?: number; allowZero?: boolean }) => {
  const { max = 1000000, allowZero = false } = params || {};

  return z.union([z.number(), z.string()])
    .transform(val => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return num;
    })
    .refine(num => Number.isFinite(num), {
      message: 'El monto debe ser un número válido'
    })
    .refine(num => allowZero ? num >= 0 : num > 0, {
      message: allowZero ? VALIDATION_MESSAGES.positiveOrZero : VALIDATION_MESSAGES.positive
    })
    .refine(num => num <= max, {
      message: VALIDATION_MESSAGES.maxAmount(max)
    })
    .refine(num => Number(num.toFixed(2)) === num, {
      message: VALIDATION_MESSAGES.decimalPlaces(2)
    });
};

/**
 * Schema de ID: string no vacío, opcionalmente nullable.
 */
export const idSchema = (params?: { nullable?: boolean; label?: string }) => {
  const { nullable = false, label = 'ID' } = params || {};
  const base = z.string().min(1, VALIDATION_MESSAGES.requiredField(label));
  return nullable ? base.nullable() : base;
};

/**
 * Schema de descripción: string opcional con límite de caracteres.
 */
export const descripcionSchema = (maxChars: number = 500) => {
  return z.string()
    .max(maxChars, VALIDATION_MESSAGES.max('Descripción', maxChars))
    .optional()
    .nullable()
    .transform(v => v ?? undefined);
};

/**
 * Schema de nombre: string requerido con límites.
 */
export const nombreSchema = (params?: { max?: number; label?: string }) => {
  const { max = 100, label = 'Nombre' } = params || {};
  return z.string()
    .min(1, VALIDATION_MESSAGES.requiredField(label))
    .max(max, VALIDATION_MESSAGES.max(label, max));
};

/**
 * Refinamiento para validar RUN chileno básico (formato 12345678-9).
 */
export const runRefinement = (value: string): boolean => {
  const runRegex = /^[\d]{1,3}[\.]?[\d]{3}[\.]?[\d]{3}[-][\dkK]{1}$/i;
  return runRegex.test(value);
};

/**
 * Refinamiento para validar teléfono chileno.
 */
export const phoneRefinement = (value: string): boolean => {
  // Acepta formatos: +56912345678, 56912345678, 912345678, +56 9 1234 5678
  const phoneRegex = /^(\+56|56)?[\s-]?9[\s-]?\d{8}$/;
  return phoneRegex.test(value.replace(/\s/g, ''));
};

/**
 * Refinamiento para validar email.
 */
export const emailRefinement = (value: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

/**
 * Refinamiento para validar fecha YYYY-MM-DD.
 */
export const dateRefinement = (value: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
};

/**
 * Refinamiento para validar dirección IPv4.
 */
export const ipv4Refinement = (value: string): boolean => {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(value)) return false;
  const parts = value.split('.').map(Number);
  return parts.every(part => part >= 0 && part <= 255);
};
