'use client';
import { Input } from '@/components/ui/input';

import { useId, useState } from 'react';
import { ChevronDown, Printer, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { printUnitLabels } from '@/lib/utils/printUnitLabels';
import { cn } from '@/lib/utils/utils';
import {
  groupLabelUnits,
  labelDate,
  type LabelGroupBy,
  type LabelUnit
} from '@/lib/utils/unitLabelGroups';

/** Etiqueta de los filtros, igual que en los demás módulos. */
const FILTER_LABEL_CLASS =
  'mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1';

export function UnitLabelSelector({
  units,
  defaultGroupBy = 'purchase',
  buttonClassName = '',
  scrollable = true,
  gridClassName,
  hideSelectPending = false,
  lockGrouping = false,
  collapsibleGroups = false,
  onDelete
}: {
  units: LabelUnit[];
  /** Agrupación inicial; "product" sirve al ingresar stock de varios productos. */
  defaultGroupBy?: LabelGroupBy;
  /** Estilo del módulo que incorpora el selector, si necesita una variante local. */
  buttonClassName?: string;
  /** Limita la lista a un alto fijo con scroll interno; `false` la deja fluir. */
  scrollable?: boolean;
  /** Columnas de la lista de códigos; por defecto 1 en móvil y 2 desde `sm`. */
  gridClassName?: string;
  /** Oculta "Seleccionar pendientes" cuando todos los códigos son recién creados. */
  hideSelectPending?: boolean;
  /** Deshabilita el selector "Agrupar por". */
  lockGrouping?: boolean;
  /** Permite contraer y expandir cada grupo de códigos. */
  collapsibleGroups?: boolean;
  /**
   * Habilita la baja manual de códigos. Sólo el detalle de producto la ofrece:
   * el selector de compras se limita a imprimir.
   */
  onDelete?: (ids: string[]) => void;
}) {
  const id = useId();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<LabelGroupBy>(defaultGroupBy);
  const [status, setStatus] = useState('all');
  const [confirmed, setConfirmed] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const current = units
    .filter(unit => !unit.estado || unit.estado === 'almacen')
    .map(unit => ({
      ...unit,
      fecha_impresion: confirmed[unit.id] ?? unit.fecha_impresion
    }));
  const visible = current.filter(
    unit =>
      status === 'all' || (status === 'printed' ? !!unit.fecha_impresion : !unit.fecha_impresion)
  );
  const printable = visible.filter(unit => selected.has(unit.id));
  const seleccionadasVisibles = visible.filter(unit => selected.has(unit.id));
  const groups = groupLabelUnits(visible, groupBy);

  function print() {
    try {
      // La etiqueta lleva el nombre del producto y la presentación cuando se conocen.
      printUnitLabels(
        printable.map(unit => ({
          code: unit.codigo_barras || unit.codigo,
          producto_nombre: unit.producto_nombre,
          presentacion_nombre: unit.presentacion_nombre
        }))
      );
      setPending(printable.map(unit => unit.id));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No se pudieron preparar las etiquetas.'
      );
    }
  }

  async function confirmPrint() {
    setSaving(true);
    try {
      const response = await fetch('/api/products/units/printed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: pending })
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || 'No se pudo guardar la impresión.');
      setConfirmed(previous => ({
        ...previous,
        ...Object.fromEntries(
          result.data.map((row: { id: string; fecha_impresion: string }) => [
            row.id,
            row.fecha_impresion
          ])
        )
      }));
      setSelected(previous => new Set([...previous].filter(value => !pending.includes(value))));
      setPending([]);
      toast.success('Códigos marcados como impresos.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la impresión.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-end gap-3'>
        <div className='min-w-[180px] flex-1 sm:flex-none'>
          <Label htmlFor={`${id}-group`} className={FILTER_LABEL_CLASS}>
            Agrupar por
          </Label>
          <Select
            value={groupBy}
            onValueChange={(value: string) => setGroupBy(value as LabelGroupBy)}
          >
            <SelectTrigger id={`${id}-group`} className='w-full sm:w-52' disabled={lockGrouping}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='presentation'>Presentación</SelectItem>
              <SelectItem value='product'>Producto</SelectItem>
              <SelectItem value='purchase'>Compra</SelectItem>
              <SelectItem value='date'>Fecha de ingreso</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='min-w-[180px] flex-1 sm:flex-none'>
          <Label htmlFor={`${id}-status`} className={FILTER_LABEL_CLASS}>
            Estado de impresión
          </Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id={`${id}-status`} className='w-full sm:w-52'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Todos</SelectItem>
              <SelectItem value='pending'>Pendientes</SelectItem>
              <SelectItem value='printed'>Impresos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className={`rounded-full ${buttonClassName}`}
            onClick={() => setSelected(new Set(visible.map(u => u.id)))}
          >
            Seleccionar todos
          </Button>
          {!hideSelectPending && (
            <Button
              type='button'
              variant='outline'
              size='sm'
              className={`rounded-full ${buttonClassName}`}
              onClick={() =>
                setSelected(new Set(visible.filter(u => !u.fecha_impresion).map(u => u.id)))
              }
            >
              Seleccionar pendientes
            </Button>
          )}
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className={`rounded-full ${buttonClassName}`}
            onClick={() => setSelected(new Set())}
            disabled={!selected.size}
          >
            Limpiar selección
          </Button>
          {onDelete ? (
            <Button
              type='button'
              variant='outline'
              size='sm'
              className={`rounded-full border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950 ${buttonClassName}`}
              onClick={() => onDelete(seleccionadasVisibles.map(unit => unit.id))}
              disabled={!seleccionadasVisibles.length}
            >
              <Trash2 data-icon='inline-start' />
              Eliminar ({seleccionadasVisibles.length})
            </Button>
          ) : null}
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            size='sm'
            className={`rounded-full ${buttonClassName}`}
            onClick={print}
            disabled={!printable.length || !!pending.length}
          >
            <Printer data-icon='inline-start' />
            Imprimir ({printable.length})
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className={`rounded-full ${buttonClassName}`}
            onClick={() => setPending(printable.map(u => u.id))}
            disabled={!printable.length || !!pending.length}
          >
            Marcar como impresos
          </Button>
        </div>
      </div>
      {!!pending.length && (
        <div role='status' className='flex flex-col gap-2 rounded-lg border p-3'>
          <p className='text-sm'>
            Confirma si las {pending.length} etiquetas se imprimieron correctamente.
          </p>
          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              size='sm'
              className={`rounded-full ${buttonClassName}`}
              onClick={confirmPrint}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Se imprimieron'}
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className={`rounded-full ${buttonClassName}`}
              onClick={() => setPending([])}
              disabled={saving}
            >
              No se imprimieron
            </Button>
          </div>
        </div>
      )}
      <p className='text-xs text-muted-foreground'>
        Etiquetas de 50 × 30 mm en A4. Imprime al 100 % y desactiva encabezados y pies de página.
      </p>
      <div className={cn('flex flex-col gap-3 p-1', scrollable && 'max-h-80 overflow-y-auto')}>
        {!groups.length && (
          <p className='text-sm text-muted-foreground'>No hay códigos con este estado.</p>
        )}
        {groups.map(group => {
          const abierto = !collapsedGroups.has(group.title);
          const header = (
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div>
                <h4 className='text-sm font-medium'>{group.title}</h4>
                <p className='text-xs text-muted-foreground'>
                  {group.units.filter(u => !u.fecha_impresion).length} pendientes ·{' '}
                  {group.units.filter(u => !!u.fecha_impresion).length} impresos
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className={`rounded-full ${buttonClassName}`}
                  onClick={() =>
                    setSelected(previous => new Set([...previous, ...group.units.map(u => u.id)]))
                  }
                >
                  Seleccionar grupo
                </Button>
                {collapsibleGroups && (
                  <CollapsibleTrigger asChild>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className={`size-8 shrink-0 ${buttonClassName}`}
                      aria-label={abierto ? `Contraer ${group.title}` : `Expandir ${group.title}`}
                    >
                      <ChevronDown
                        className={cn('size-4 transition-transform', abierto && 'rotate-180')}
                        aria-hidden='true'
                      />
                    </Button>
                  </CollapsibleTrigger>
                )}
              </div>
            </div>
          );
          const codigos = (
            <div className={cn('grid grid-cols-1 gap-2 sm:grid-cols-2', gridClassName)}>
              {group.units.map(unit => (
                <div
                  key={unit.id}
                  className='flex items-center gap-2 rounded-lg border p-2 sm:gap-3 sm:p-3'
                >
                  <Input
                    type='checkbox'
                    checked={selected.has(unit.id)}
                    aria-label={`Seleccionar código ${unit.codigo_barras || unit.codigo}`}
                    onChange={event => {
                      const checked = event.target.checked;
                      setSelected(previous => {
                        const next = new Set(previous);
                        if (checked) next.add(unit.id);
                        else next.delete(unit.id);
                        return next;
                      });
                    }}
                  />
                  <span className='flex min-w-0 flex-1 flex-col gap-1'>
                    <span className='font-mono text-xs break-all'>
                      {unit.codigo_barras || unit.codigo}
                    </span>
                    <span className='text-xs text-muted-foreground'>
                      {unit.fecha_impresion
                        ? `Impreso · ${labelDate(unit.fecha_impresion)}`
                        : 'Pendiente de impresión'}
                    </span>
                    {unit.presentacion_nombre && (
                      <span className='text-xs text-muted-foreground'>
                        {unit.presentacion_nombre}
                      </span>
                    )}
                    <span className='text-xs text-muted-foreground'>
                      {unit.compra_folio ? `Compra ${unit.compra_folio}` : 'Sin compra asociada'}
                      {unit.estado && unit.estado !== 'almacen' ? ' · Inactivo' : ''}
                    </span>
                  </span>
                  {onDelete ? (
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='ml-auto size-8 shrink-0 text-muted-foreground hover:text-red-600'
                      title='Eliminar código'
                      aria-label={`Eliminar código ${unit.codigo_barras || unit.codigo}`}
                      onClick={() => onDelete([unit.id])}
                    >
                      <Trash2 className='size-4' aria-hidden='true' />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          );

          return (
            <section key={group.title} className='rounded-lg border p-3' aria-label={group.title}>
              {collapsibleGroups ? (
                <Collapsible
                  open={abierto}
                  onOpenChange={open =>
                    setCollapsedGroups(previous => {
                      const next = new Set(previous);
                      if (open) next.delete(group.title);
                      else next.add(group.title);
                      return next;
                    })
                  }
                >
                  {header}
                  <CollapsibleContent className='pt-2'>{codigos}</CollapsibleContent>
                </Collapsible>
              ) : (
                <>
                  <div className='mb-2'>{header}</div>
                  {codigos}
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
