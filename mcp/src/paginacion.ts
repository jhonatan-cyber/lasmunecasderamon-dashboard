import { z } from 'zod';

export const paginacion = {
  limit: z.number().int().min(1).max(100).optional().describe('Tamaño de página; por defecto 20, máximo 100'),
  offset: z.number().int().min(0).max(100000).optional().describe('Filas a omitir; por defecto 0')
};

/** Adaptador MCP para APIs existentes que todavía devuelven listas completas. */
export function paginar(datos: unknown, args: { limit?: number; offset?: number }, campos: string[] = []) {
  const limit = args.limit ?? 20;
  const offset = args.offset ?? 0;
  const pagina = (items: unknown[]) => ({
    items: items.slice(offset, offset + limit), total: items.length,
    limit, offset, hay_mas: offset + limit < items.length
  });
  if (Array.isArray(datos)) return pagina(datos);
  if (!datos || typeof datos !== 'object') return datos;
  const resultado = { ...datos } as Record<string, unknown>;
  for (const campo of campos) {
    if (Array.isArray(resultado[campo])) resultado[campo] = pagina(resultado[campo] as unknown[]);
  }
  return resultado;
}
