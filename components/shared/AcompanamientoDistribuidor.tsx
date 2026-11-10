'use client';

import { Button } from '@/components/ui/button';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { SearchableSelect } from '@/components/shared/SearchableSelect';
import { Minus, Plus, X } from 'lucide-react';
import type { AcompanamientoBotellaItem } from '@/lib/sales/acompanamientoBotella';
import { precioUnitarioAcompanamiento } from '@/lib/sales/recargoAcompanamiento';
import { productImageUrl } from '@/lib/utils/productImage';

export type OpcionAcompanamiento = {
  id: string;
  producto_nombre: string;
  nombre: string;
  stock_bar: number;
  foto?: string | null;
  /** Precio del acompañamiento; si falta se intenta deducir del producto de bar. */
  precio?: number | null;
};

type Props = {
  id: string;
  opciones: OpcionAcompanamiento[];
  /** Unidades de bebida que reparte cada entrega: botella lo configurado, corte 1. */
  requeridas: number;
  /** Reparto por entrega (sabor + unidades); la suma debe dar `requeridas`. */
  valor: AcompanamientoBotellaItem[];
  onChange: (valor: AcompanamientoBotellaItem[]) => void;
  /** Entregas que comparten el mismo reparto; topa el máximo por sabor según stock. */
  repeticiones?: number;
  /**
   * `requeridas` cubre todas las entregas juntas (se reparten sabores distintos
   * entre ellas) en vez de repetir el mismo reparto en cada una.
   */
  repartoTotal?: boolean;
  disabled?: boolean;
};

const nombreDe = (opcion: OpcionAcompanamiento) =>
  `${opcion.producto_nombre} ${opcion.nombre}`.trim();

/**
 * Reparte las unidades de acompañamiento de una entrega entre varios sabores:
 * 2 fantas, 1 cocacola y 1 agua hasta sumar exactamente lo requerido. Reemplaza
 * al selector de una sola bebida cuando se quieren repartir sabores.
 */
export function AcompanamientoDistribuidor({
  id,
  opciones,
  requeridas,
  valor,
  onChange,
  repeticiones = 1,
  repartoTotal = false,
  disabled = false
}: Props) {
  const lotes = repartoTotal ? 1 : Math.max(1, Math.floor(repeticiones));
  const requerido = Math.max(1, Math.floor(requeridas));
  const asignado = valor.reduce((suma, sabor) => suma + sabor.unidades, 0);
  const restante = Math.max(0, requerido - asignado);
  const elegidos = new Set(valor.map(sabor => sabor.presentacion_id));
  const disponibles = opciones.filter(opcion => !elegidos.has(opcion.id));

  const stockDe = (sabor: AcompanamientoBotellaItem) =>
    opciones.find(opcion => opcion.id === sabor.presentacion_id)?.stock_bar ?? 0;
  const maxDe = (sabor: AcompanamientoBotellaItem) => {
    const otros = asignado - sabor.unidades;
    return Math.max(1, Math.min(requerido - otros, Math.floor(stockDe(sabor) / lotes)));
  };

  const agregar = (presentacionId: string) => {
    if (disabled || restante < 1) return;
    const opcion = opciones.find(item => item.id === presentacionId);
    if (!opcion || elegidos.has(opcion.id)) return;
    onChange([
      ...valor,
      {
        presentacion_id: opcion.id,
        unidades: 1,
        nombre: nombreDe(opcion),
        foto: opcion.foto ?? null,
        precio: opcion.precio ?? precioUnitarioAcompanamiento(opcion)
      }
    ]);
  };

  const ajustar = (presentacionId: string, delta: number) =>
    onChange(
      valor.map(sabor =>
        sabor.presentacion_id === presentacionId
          ? { ...sabor, unidades: sabor.unidades + delta }
          : sabor
      )
    );

  const quitar = (presentacionId: string) =>
    onChange(valor.filter(sabor => sabor.presentacion_id !== presentacionId));

  return (
    <div className='space-y-2'>
      <p className='text-xs text-muted-foreground'>
        {restante > 0
          ? `Reparte ${requerido} unidad${requerido === 1 ? '' : 'es'} ${
              repartoTotal ? 'en total' : 'por entrega'
            } · ${asignado}/${requerido}`
          : `Reparto completo · ${requerido} unidad${
              requerido === 1 ? '' : 'es'
            } ${repartoTotal ? 'en total' : 'por entrega'}`}
      </p>

      {disponibles.length > 0 && restante > 0 ? (
        <SearchableSelect
          id={id}
          value=''
          onChange={agregar}
          placeholder='Agregar sabor…'
          searchPlaceholder='Buscar bebida…'
          disabled={disabled}
          options={disponibles.map(opcion => ({
            value: opcion.id,
            label: `${nombreDe(opcion)} · ${opcion.stock_bar} en bar`,
            keywords: [opcion.producto_nombre, opcion.nombre]
          }))}
        />
      ) : null}

      {valor.length > 0 ? (
        <ul className='space-y-2'>
          {valor.map(sabor => {
            const opcion = opciones.find(item => item.id === sabor.presentacion_id);
            const nombre = sabor.nombre || (opcion ? nombreDe(opcion) : sabor.presentacion_id);
            const max = maxDe(sabor);
            const stock = stockDe(sabor);
            return (
              <li
                key={sabor.presentacion_id}
                className='flex items-center gap-2 rounded-xl border p-2'
              >
                <span className='relative size-9 shrink-0 overflow-hidden rounded-lg bg-muted/40'>
                  <ProductPhoto
                    src={productImageUrl(sabor.foto, opcion?.foto)}
                    alt={nombre}
                    fill
                    className='object-contain p-1'
                  />
                </span>
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium'>{nombre}</p>
                  <p className='text-[11px] text-muted-foreground'>
                    Stock: {stock} · máx {max}
                  </p>
                </div>
                <div className='flex items-center gap-1'>
                  <Button
                    type='button'
                    size='icon'
                    variant='outline'
                    className='size-7 rounded-full'
                    aria-label={`Quitar una unidad de ${nombre}`}
                    disabled={disabled || sabor.unidades <= 1}
                    onClick={() => ajustar(sabor.presentacion_id, -1)}
                  >
                    <Minus className='size-3' />
                  </Button>
                  <span className='w-5 text-center text-sm font-semibold tabular-nums'>
                    {sabor.unidades}
                  </span>
                  <Button
                    type='button'
                    size='icon'
                    variant='outline'
                    className='size-7 rounded-full'
                    aria-label={`Agregar una unidad de ${nombre}`}
                    disabled={disabled || sabor.unidades >= max}
                    onClick={() => ajustar(sabor.presentacion_id, 1)}
                  >
                    <Plus className='size-3' />
                  </Button>
                  <Button
                    type='button'
                    size='icon'
                    variant='ghost'
                    className='size-7 rounded-full text-destructive'
                    aria-label={`Quitar ${nombre}`}
                    disabled={disabled}
                    onClick={() => quitar(sabor.presentacion_id)}
                  >
                    <X className='size-3' />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
