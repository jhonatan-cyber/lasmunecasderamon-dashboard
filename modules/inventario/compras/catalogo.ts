import { ProductService } from '../productos/fachada';

/** Catálogo de compra: una fila por presentación, con foto heredada si hace falta. */
export async function listar() {
  const productos = (await ProductService.getAll()).filter(producto => producto.status === 1);
  const presentaciones = await ProductService.listPresentationsMap(
    productos.map(producto => String(producto.id ?? '')).filter(Boolean)
  );

  return productos.flatMap(producto =>
    (presentaciones[String(producto.id)] ?? []).map(presentacion => ({
      id: String(presentacion.id),
      producto_id: String(producto.id),
      producto_nombre: producto.name,
      nombre: presentacion.nombre,
      foto: presentacion.foto || producto.foto || 'default.png',
      precio_compra: Number(presentacion.precio_compra ?? 0),
      stock: Number(presentacion.stock ?? 0)
    }))
  );
}
