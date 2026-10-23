import { arrayMove } from '@dnd-kit/sortable';

/**
 * Aplica un movimiento hecho sobre el listado filtrado al orden completo.
 *
 * El arrastre solo ve las presentaciones que dejan los filtros; las que están
 * ocultas conservan su posición para que al limpiar la búsqueda el listado siga
 * teniendo el orden que el usuario armó.
 */
export function moverEnListadoFiltrado<T extends { id: string }>(
  todos: T[],
  visibles: T[],
  desdeId: string,
  hastaId: string
): T[] | null {
  const desde = visibles.findIndex(item => item.id === desdeId);
  const hasta = visibles.findIndex(item => item.id === hastaId);
  if (desde < 0 || hasta < 0 || desde === hasta) return null;
  const reordenados = arrayMove(visibles, desde, hasta);
  const idsVisibles = new Set(reordenados.map(item => item.id));
  let cursor = 0;
  return todos.map(item => (idsVisibles.has(item.id) ? reordenados[cursor++] : item));
}
