export type Exact<T, S extends T> = {
  [K in keyof S]: S[K];
};

export const exact = <T>(value: T): T => value;

export type NonEmptyString = string & { __brand: 'NonEmptyString' };

export const createNonEmptyString = (value: string): NonEmptyString | null => {
  return value.trim().length > 0 ? (value as NonEmptyString) : null;
};

export type PositiveNumber = number & { __brand: 'PositiveNumber' };

export const createPositiveNumber = (value: number): PositiveNumber | null => {
  return value > 0 ? (value as PositiveNumber) : null;
};

export type ValidDate = Date & { __brand: 'ValidDate' };

export const createValidDate = (value: Date | string): ValidDate | null => {
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : (date as ValidDate);
};

export type RequiredKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

export type AllRequired<T> = Pick<T, RequiredKeys<T>>;

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

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

export interface EntityWithId {
  id: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export type Status = 'active' | 'inactive' | 'pending' | 'archived';

export type UserRole = 'admin' | 'garzon' | 'cajero' | 'anfitriona' | 'manager';

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
