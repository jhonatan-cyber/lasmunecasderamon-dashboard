'use client';
import { ErrorState } from '@/components/shared/ErrorState';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table';
import { FormattedNumberInput as Input } from '@/components/shared/FormattedNumberInput';

import { useState, useEffect, useImperativeHandle, useRef, type Ref } from 'react';

interface ChampagneRow {
  anfitrionas: number;
  precio: string;
  comision: string;
}

export interface SettingsTiersHandle {
  getTiers: () => Array<{ anfitrionas: number; precio: number; comision: number }>;
}

/** Tope de la tabla: el mismo que la transferencia y la API de tramos (1..20). */
const MAX_TIERS = 20;

const formatMiles = (v: string | number) =>
  String(v ?? '')
    .replace(/\D/g, '')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const toNumber = (v: string) => Number(String(v).replace(/\./g, '')) || 0;

function defaultRows(n: number, precio: number, comision: number): ChampagneRow[] {
  const rows: ChampagneRow[] = [];
  for (let i = 1; i <= n; i++) {
    rows.push({
      anfitrionas: i,
      precio: formatMiles(precio),
      comision: formatMiles(comision)
    });
  }
  return rows;
}

/** Tabla de precios por cantidad de anfitrionas, controlada por el máximo del producto. */
export function SettingsChampagneTiers({
  productId,
  maxAnfitrionas,
  precioBase = 0,
  comisionBase = 0,
  ref,
  disabled = false
}: {
  productId: string;
  maxAnfitrionas: number;
  precioBase?: number;
  comisionBase?: number;
  ref?: Ref<SettingsTiersHandle>;
  disabled?: boolean;
}) {
  const maxN = Math.min(MAX_TIERS, Math.max(1, Math.floor(maxAnfitrionas)));
  const [rows, setRows] = useState<ChampagneRow[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const baseValues = useRef({ precio: precioBase, comision: comisionBase });
  const firstRowDefaults = useRef({ precio: false, comision: false });
  useEffect(() => {
    baseValues.current = { precio: precioBase, comision: comisionBase };
    setRows(previous =>
      previous.map(row =>
        row.anfitrionas !== 1
          ? row
          : {
              ...row,
              ...(firstRowDefaults.current.precio ? { precio: formatMiles(precioBase) } : {}),
              ...(firstRowDefaults.current.comision ? { comision: formatMiles(comisionBase) } : {})
            }
      )
    );
  }, [precioBase, comisionBase]);

  useEffect(() => {
    if (!productId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    firstRowDefaults.current = { precio: false, comision: false };
    setLoadingTiers(true);
    setLoadError(false);
    fetch(`/api/products/${productId}/tiers`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error('No se pudo cargar la tabla');
        return data;
      })
      .then(data => {
        if (cancelled) return;
        const saved = data.success && Array.isArray(data.data) ? data.data : [];
        const firstSaved = saved.some((row: any) => Number(row.anfitrionas) === 1);
        firstRowDefaults.current = { precio: !firstSaved, comision: !firstSaved };
        const defaults = defaultRows(
          MAX_TIERS,
          baseValues.current.precio,
          baseValues.current.comision
        );
        const merged: ChampagneRow[] = [];
        for (let i = 1; i <= MAX_TIERS; i++) {
          const found = saved.find((t: any) => Number(t.anfitrionas) === i);
          const base = defaults[i - 1];
          merged.push({
            anfitrionas: i,
            precio: found ? formatMiles(found.precio) : base.precio,
            comision: found ? formatMiles(found.comision) : base.comision
          });
        }
        setRows(merged);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingTiers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);
  const visibleRows = rows.slice(0, maxN);

  useImperativeHandle(
    ref,
    () => ({
      getTiers: () => {
        if (loadingTiers || loadError || visibleRows.length !== maxN)
          throw new Error('Esperá a que se cargue la tabla de precios antes de guardar');
        for (const row of visibleRows) {
          if (row.precio.trim() === '' || isNaN(toNumber(row.precio))) {
            throw new Error(`Fila ${row.anfitrionas}: precio inválido`);
          }
          if (row.comision.trim() !== '' && isNaN(toNumber(row.comision))) {
            throw new Error(`Fila ${row.anfitrionas}: comisión inválida`);
          }
        }
        return visibleRows.map(r => ({
          anfitrionas: r.anfitrionas,
          precio: toNumber(r.precio),
          comision: toNumber(r.comision)
        }));
      }
    }),
    [visibleRows, loadingTiers, loadError, maxN]
  );

  return (
    <div className='space-y-4'>
      <div className='flex flex-col sm:flex-row gap-4 sm:items-end justify-between'>
        <div>
          <p className='text-sm font-bold text-purple-900 dark:text-purple-200'>
            Precios por cantidad de anfitrionas
          </p>
        </div>
        <p className='text-xs text-muted-foreground'>
          Máximo: {maxN} anfitrionas · tabla compartida por producto
        </p>
      </div>

      {loadingTiers ? (
        <div className='text-center py-6'>
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto' />
        </div>
      ) : loadError ? (
        <ErrorState message='No se pudo cargar la tabla. Volvé a seleccionar el producto para reintentar.' />
      ) : (
        <div className='overflow-x-auto rounded-2xl border border-purple-200 dark:border-purple-900/40 bg-white dark:bg-neutral-950'>
          <Table className='w-full'>
            <TableHeader className='bg-purple-50 dark:bg-purple-900/20'>
              <TableRow>
                <TableHead className='font-bold text-purple-700 dark:text-purple-300 tracking-wider text-center'>
                  Anfitrionas
                </TableHead>
                <TableHead className='font-bold text-purple-700 dark:text-purple-300 tracking-wider text-center'>
                  Precio
                </TableHead>
                <TableHead className='font-bold text-purple-700 dark:text-purple-300 tracking-wider text-center'>
                  Comisión total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className='divide-y divide-purple-100 dark:divide-purple-900/30'>
              {visibleRows.map((row, i) => (
                <TableRow
                  key={row.anfitrionas}
                  className='hover:bg-purple-50/50 dark:hover:bg-purple-900/10'
                >
                  <TableCell className='text-center'>
                    <span className='inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold text-sm'>
                      {row.anfitrionas}
                    </span>
                  </TableCell>
                  <TableCell className='text-center'>
                    <div className='mx-auto w-36'>
                      <Input
                        currency
                        inputMode='numeric'
                        disabled={disabled}
                        aria-label={`Precio para ${row.anfitrionas} anfitrionas`}
                        value={row.precio}
                        onChange={e => {
                          if (row.anfitrionas === 1) firstRowDefaults.current.precio = false;
                          const v = e.target.value
                            .replace(/\D/g, '')
                            .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                          setRows(prev => prev.map((r, j) => (j === i ? { ...r, precio: v } : r)));
                        }}
                        className='w-full px-7 py-1.5 text-center bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full text-sm'
                      />
                    </div>
                  </TableCell>
                  <TableCell className='text-center'>
                    <div className='mx-auto w-36'>
                      <Input
                        currency
                        inputMode='numeric'
                        disabled={disabled}
                        aria-label={`Comisión para ${row.anfitrionas} anfitrionas`}
                        value={row.comision}
                        onChange={e => {
                          if (row.anfitrionas === 1) firstRowDefaults.current.comision = false;
                          const v = e.target.value
                            .replace(/\D/g, '')
                            .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                          setRows(prev =>
                            prev.map((r, j) => (j === i ? { ...r, comision: v } : r))
                          );
                        }}
                        className='w-full px-7 py-1.5 text-center bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-full text-sm'
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
