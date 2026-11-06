import { ProductService } from '../productos/fachada';
import { query } from '@/lib/database/db';
import {
  estadoVencimiento,
  fechaVencimientoUnidad,
  hoyDelNegocio
} from '@/lib/business/vencimiento';
import { ESTADO_UNIDAD_ACTIVA } from '../estados';

export interface UnidadesPresentacionResumen {
  vencidas: { cantidad: number; codigos: string[] };
  por_vencer: { cantidad: number; codigos: string[] };
  buen_estado: { cantidad: number; codigos: string[] };
}

/** Catálogo de compra: una fila por presentación, con foto heredada si hace falta. */
export async function listar() {
  const productos = (await ProductService.getAll()).filter(producto => producto.status === 1);
  const presentaciones = await ProductService.listPresentationsMap(
    productos.map(producto => String(producto.id ?? '')).filter(Boolean)
  );
  const hoy = hoyDelNegocio();
  const unidades = await query<any[]>(
    `SELECT u.presentacion_id, u.codigo, u.codigo_barras,
            u.fecha_vencimiento AS fecha_unidad,
            p.fecha_vencimiento AS fecha_presentacion
       FROM inventario_unidades u
       JOIN inventario_presentaciones p ON p.id = u.presentacion_id
      WHERE u.estado = '${ESTADO_UNIDAD_ACTIVA}'
        AND u.ubicacion = 'almacen'`,
    []
  );
  const resumenPorPresentacion = new Map<string, UnidadesPresentacionResumen>();

  for (const unidad of unidades) {
    const presentacionId = String(unidad.presentacion_id ?? '');
    if (!presentacionId) continue;
    if (!resumenPorPresentacion.has(presentacionId)) {
      resumenPorPresentacion.set(presentacionId, {
        vencidas: { cantidad: 0, codigos: [] },
        por_vencer: { cantidad: 0, codigos: [] },
        buen_estado: { cantidad: 0, codigos: [] }
      });
    }
    const resumen = resumenPorPresentacion.get(presentacionId)!;
    const fecha = fechaVencimientoUnidad(
      unidad.fecha_unidad ? String(unidad.fecha_unidad) : null,
      unidad.fecha_presentacion ? String(unidad.fecha_presentacion) : null
    );
    const estado = estadoVencimiento(fecha, hoy)?.estado;
    const codigo = String(unidad.codigo ?? unidad.codigo_barras ?? '').trim();
    const grupo =
      estado === 'vencido'
        ? resumen.vencidas
        : estado === 'por_vencer'
          ? resumen.por_vencer
          : resumen.buen_estado;
    grupo.cantidad += 1;
    if (codigo && !grupo.codigos.includes(codigo)) grupo.codigos.push(codigo);
  }

  return productos.flatMap(producto =>
    (presentaciones[String(producto.id)] ?? []).map(presentacion => ({
      id: String(presentacion.id),
      producto_id: String(producto.id),
      producto_nombre: producto.name,
      categoria_nombre: (producto as typeof producto & { categoria?: string }).categoria,
      codigo_barras: presentacion.codigo_barras,
      nombre: presentacion.nombre,
      foto: presentacion.foto || producto.foto || 'default.png',
      precio_compra: Number(presentacion.precio_compra ?? 0),
      stock: Number(presentacion.stock ?? 0),
      resumen_stock: resumenPorPresentacion.get(String(presentacion.id)) ?? {
        vencidas: { cantidad: 0, codigos: [] },
        por_vencer: { cantidad: 0, codigos: [] },
        buen_estado: { cantidad: 0, codigos: [] }
      }
    }))
  );
}
