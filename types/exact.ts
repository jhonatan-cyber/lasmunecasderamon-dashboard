/**
 * Tipos estrictos para el proyecto
 *
 * Usage:
 * import type { Exact } from '@/types/exact'
 * import { exact } from '@/types/exact'
 *
 * // Para hacer un tipo exacto (sin propiedades opcionales adicionales)
 * type StrictUser = Exact<BaseUser, { name: string; email: string }>
 */

// Utility type para hacer tipos exactamente lo que se especifica
// Previene la adición de propiedades extra
export type Exact<T, S extends T> = {
  [K in keyof S]: S[K];
};

// Helper para crear tipos exactos
export const exact = <T>(value: T): T => value;

// Tipo para IDs seguros (string que no sea empty)
export type NonEmptyString = string & { __brand: 'NonEmptyString' };

export const createNonEmptyString = (value: string): NonEmptyString | null => {
  return value.trim().length > 0 ? (value as NonEmptyString) : null;
};

// Tipo para números positivos
export type PositiveNumber = number & { __brand: 'PositiveNumber' };

export const createPositiveNumber = (value: number): PositiveNumber | null => {
  return value > 0 ? (value as PositiveNumber) : null;
};

// Tipo para fechas válidas
export type ValidDate = Date & { __brand: 'ValidDate' };

export const createValidDate = (value: Date | string): ValidDate | null => {
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : (date as ValidDate);
};

// Tipo para objetos con ключ ключ (sin null/undefined)
export type RequiredKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

export type AllRequired<T> = Pick<T, RequiredKeys<T>>;

// Tipo para respuestas API estándar
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

// Tipo para paginación
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Tipo para entidades con ID
export interface EntityWithId {
  id: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Tipo para opciones de select
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

// Tipo para estados
export type Status = 'active' | 'inactive' | 'pending' | 'archived';

// Tipo para roles de usuario
export type UserRole = 'admin' | 'garzon' | 'cajero' | 'anfitriona' | 'manager';

// Tipo para errores de validación
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
