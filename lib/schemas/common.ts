import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

export const paginationResponseSchema = z.object({
  data: z.array(z.unknown()),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int()
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export const idSchema = z.object({
  id: z.coerce.number().int().positive().or(z.string().uuid())
});

export const idsSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1)
});

export const searchQuerySchema = z.object({
  search: z.string().max(100).optional()
});

export const statusQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'all']).default('all')
});

export const sortQuerySchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const baseQuerySchema = paginationSchema
  .merge(searchQuerySchema)
  .merge(statusQuerySchema)
  .merge(sortQuerySchema);

export const booleanQuerySchema = z.object({
  includeDeleted: z.coerce.boolean().default(false)
});

export const idParamSchema = idSchema;

export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type BaseQueryInput = z.infer<typeof baseQuerySchema>;
