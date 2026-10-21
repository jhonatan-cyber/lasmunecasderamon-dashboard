/**
 * Regla única de colación por rol: la anfitriona recibe los productos
 * habilitados para colación; cajero, garzón y barman reciben únicamente
 * bebidas analcohólicas. La usan tanto la UI como el servidor para que el
 * catálogo mostrado y el producto aceptado no diverjan.
 */
import { urlProductosParaVenta } from '@/lib/constants/api-endpoints';

export const CATEGORIA_BEBIDAS_ANALCOHOLICAS = 'bebidas_analcoholicas' as const;

export type CatalogoColacion = 'productos' | 'analcoholicas';

export type ParametroCatalogoColacion = 'solo_colaciones' | 'solo_colaciones_analcoholicas';

interface DefinicionCatalogo {
  /** Parámetro de query que entiende el endpoint de catálogo. */
  parametroCatalogo: ParametroCatalogoColacion;
  /** Categoría protegida exigida; null = cualquier producto habilitado. */
  categoriaSistema: typeof CATEGORIA_BEBIDAS_ANALCOHOLICAS | null;
}

export interface ReglaColacion extends DefinicionCatalogo {
  /** Catálogo que corresponde mostrar al rol. */
  catalogo: CatalogoColacion;
}

export const CATALOGOS_COLACION: Record<CatalogoColacion, DefinicionCatalogo> = {
  productos: { parametroCatalogo: 'solo_colaciones', categoriaSistema: null },
  analcoholicas: {
    parametroCatalogo: 'solo_colaciones_analcoholicas',
    categoriaSistema: CATEGORIA_BEBIDAS_ANALCOHOLICAS
  }
};

const ROLES_BAR = ['cajero', 'garzon', 'barman'] as const;

/** Roles con derecho a colación; el orden define el contrato del endpoint. */
export const ROLES_COLACION = ['anfitriona', ...ROLES_BAR] as const;
export type RolColacion = (typeof ROLES_COLACION)[number];

export function reglaColacionPorRol(rol?: string | null): ReglaColacion | null {
  const normalizado = (rol ?? '').trim().toLowerCase();
  if (normalizado === 'anfitriona')
    return { catalogo: 'productos', ...CATALOGOS_COLACION.productos };
  if ((ROLES_BAR as readonly string[]).includes(normalizado))
    return { catalogo: 'analcoholicas', ...CATALOGOS_COLACION.analcoholicas };
  return null;
}

/**
 * Regla completa por rol para clientes externos (app móvil): evita que cada
 * cliente repita el mapeo rol → catálogo o la categoría protegida.
 */
export function reglasColacion(): Record<RolColacion, ReglaColacion> {
  const entradas = ROLES_COLACION.map(rol => {
    const regla = reglaColacionPorRol(rol);
    if (!regla) throw new Error(`Rol de colación sin regla: ${rol}`);
    return [rol, regla] as const;
  });
  return Object.fromEntries(entradas) as Record<RolColacion, ReglaColacion>;
}

/** Query que el endpoint de catálogo espera para cada catálogo de colación. */
export function parametrosCatalogoColacion(catalogo: CatalogoColacion): Record<string, string> {
  return { [CATALOGOS_COLACION[catalogo].parametroCatalogo]: 'true' };
}

/** URL del catálogo de colación sobre el endpoint compartido de venta. */
export function urlCatalogoColacion(catalogo: CatalogoColacion): string {
  return urlProductosParaVenta(parametrosCatalogoColacion(catalogo));
}

/** Un producto es válido si la regla no exige categoría o si coincide con ella. */
export function productoPermitidoParaRol(regla: ReglaColacion, systemKey?: string | null): boolean {
  return regla.categoriaSistema === null || systemKey === regla.categoriaSistema;
}
