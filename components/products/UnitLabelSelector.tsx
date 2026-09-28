'use client';

import { useId, useState } from 'react';
import { Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { printUnitLabels } from '@/lib/utils/printUnitLabels';
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
  defaultGroupBy = 'purchase'
}: {
  units: LabelUnit[];
  /** Agrupación inicial; "product" sirve al ingresar stock de varios productos. */
  defaultGroupBy?: LabelGroupBy;
}) {
  const id = useId();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<LabelGroupBy>(defaultGroupBy);
  const [status, setStatus] = useState('all');
  const [confirmed, setConfirmed] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const current = units.map(unit => ({
    ...unit,
    fecha_impresion: confirmed[unit.id] ?? unit.fecha_impresion
  }));
  const visible = current.filter(
    unit =>
      status === 'all' || (status === 'printed' ? !!unit.fecha_impresion : !unit.fecha_impresion)
  );
  const printable = visible.filter(unit => selected.has(unit.id));
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
            <SelectTrigger id={`${id}-group`} className='w-full sm:w-52'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
            className='rounded-full'
            onClick={() => setSelected(new Set(visible.map(u => u.id)))}
          >
            Seleccionar todos
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='rounded-full'
            onClick={() =>
              setSelected(new Set(visible.filter(u => !u.fecha_impresion).map(u => u.id)))
            }
          >
            Seleccionar pendientes
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='rounded-full'
            onClick={() => setSelected(new Set())}
            disabled={!selected.size}
          >
            Limpiar selección
          </Button>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            size='sm'
            className='rounded-full'
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
            className='rounded-full'
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
              className='rounded-full'
              onClick={confirmPrint}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Se imprimieron'}
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='rounded-full'
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
      <div className='flex max-h-80 flex-col gap-3 overflow-y-auto p-1'>
        {!groups.length && (
          <p className='text-sm text-muted-foreground'>No hay códigos con este estado.</p>
        )}
        {groups.map(group => (
          <section key={group.title} className='rounded-lg border p-3' aria-label={group.title}>
            <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
              <div>
                <h4 className='text-sm font-medium'>{group.title}</h4>
                <p className='text-xs text-muted-foreground'>
                  {group.units.filter(u => !u.fecha_impresion).length} pendientes ·{' '}
                  {group.units.filter(u => !!u.fecha_impresion).length} impresos
                </p>
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='rounded-full'
                onClick={() =>
                  setSelected(previous => new Set([...previous, ...group.units.map(u => u.id)]))
                }
              >
                Seleccionar grupo
              </Button>
            </div>
            <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
              {group.units.map(unit => (
                <label
                  key={unit.id}
                  className='flex cursor-pointer items-center gap-3 rounded-lg border p-3'
                >
                  <input
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
                  <span className='flex min-w-0 flex-col gap-1'>
                    <span className='font-mono text-xs'>{unit.codigo_barras || unit.codigo}</span>
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
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
