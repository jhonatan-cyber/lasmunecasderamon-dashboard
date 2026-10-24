'use client';

import { DatePicker } from '@/components/shared/DatePicker';
import { SortSelect } from '@/components/shared/selects/SortSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Bell,
  BellOff,
  Grid3X3,
  PackageCheck,
  Search,
  Table as TableIcon,
  Wine,
  X
} from 'lucide-react';
import type { RefObject } from 'react';

export type FiltroTipoMovimiento = 'todos' | 'venta' | 'colacion' | 'traspaso' | 'devolucion';

// Tipos de `inventario_movimientos` que escribe el negocio (venta, colación,
// traspaso y devolución por anulación); «Todos» muestra también los históricos.
export const TIPOS_MOVIMIENTO: { valor: FiltroTipoMovimiento; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'venta', etiqueta: 'Ventas' },
  { valor: 'colacion', etiqueta: 'Colaciones' },
  { valor: 'traspaso', etiqueta: 'Traspasos' },
  { valor: 'devolucion', etiqueta: 'Devoluciones' }
];

interface BarProductosToolbarProps {
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSortChange: (field: string, direction: 'asc' | 'desc') => void;
  search: string;
  onSearchChange: (value: string) => void;
  stockFilter: string;
  onToggleStockFilter: () => void;
  showTableView: boolean;
  onToggleTableView: () => void;
}

export function BarProductosToolbar({
  sortField,
  sortDirection,
  onSortChange,
  search,
  onSearchChange,
  stockFilter,
  onToggleStockFilter,
  showTableView,
  onToggleTableView
}: BarProductosToolbarProps) {
  return (
    <div className='flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-3'>
      <SortSelect
        className='w-full sm:w-48'
        field={sortField}
        direction={sortDirection}
        options={[
          { value: 'orden', label: 'Orden manual' },
          { value: 'producto_nombre', label: 'Producto' },
          { value: 'nombre', label: 'Presentación' },
          { value: 'categoria_nombre', label: 'Categoría' },
          { value: 'stock_bar', label: 'Stock' }
        ]}
        onChange={onSortChange}
      />
      <div className='relative min-w-0 flex-1 basis-full sm:basis-64'>
        <Search
          className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
          aria-hidden='true'
        />
        <Input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder='Buscar producto, categoría, presentación o código'
          aria-label='Buscar productos del bar'
          className='h-11 rounded-full pl-9 pr-11'
        />
        {search && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='absolute right-0 top-0 size-11 rounded-full'
                aria-label='Limpiar búsqueda'
                onClick={() => onSearchChange('')}
              >
                <X />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Limpiar búsqueda</TooltipContent>
          </Tooltip>
        )}
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={stockFilter === 'abiertas' ? 'secondary' : 'outline'}
            className='h-11 shrink-0 gap-2 rounded-full'
            onClick={onToggleStockFilter}
            aria-label='Filtrar solo botellas abiertas'
            aria-pressed={stockFilter === 'abiertas'}
          >
            <Wine />
            {stockFilter === 'abiertas' ? 'Botellas abiertas' : 'Todos'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {stockFilter === 'abiertas'
            ? 'Mostrar todos'
            : 'Mostrar botellas abiertas y vacías por cortos'}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='outline'
            className='h-11 shrink-0 gap-2 rounded-full'
            onClick={onToggleTableView}
            aria-label={showTableView ? 'Cambiar a tarjetas' : 'Cambiar a tabla'}
          >
            {showTableView ? <Grid3X3 /> : <TableIcon />}
            {showTableView ? 'Tarjetas' : 'Tabla'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{showTableView ? 'Cambiar a tarjetas' : 'Cambiar a tabla'}</TooltipContent>
      </Tooltip>
    </div>
  );
}

interface SearchToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  clearAriaLabel: string;
}

function SearchToolbar({
  search,
  onSearchChange,
  placeholder,
  ariaLabel,
  clearAriaLabel
}: SearchToolbarProps) {
  return (
    <div className='relative rounded-2xl border bg-card p-3'>
      <Search className='pointer-events-none absolute left-6 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
      <Input
        value={search}
        onChange={event => onSearchChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className='h-11 rounded-full pl-9 pr-12'
      />
      {search && (
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='absolute right-5 top-1/2 size-9 -translate-y-1/2 rounded-full'
          aria-label={clearAriaLabel}
          onClick={() => onSearchChange('')}
        >
          <X />
        </Button>
      )}
    </div>
  );
}

interface BarPendientesToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function BarPendientesToolbar({ search, onSearchChange }: BarPendientesToolbarProps) {
  return (
    <SearchToolbar
      search={search}
      onSearchChange={onSearchChange}
      placeholder='Buscar producto, presentación o solicitante'
      ariaLabel='Buscar transferencias pendientes'
      clearAriaLabel='Limpiar búsqueda de pendientes'
    />
  );
}

interface BarHistorialToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filtroTipoMov: FiltroTipoMovimiento;
  onFiltroTipoMovChange: (valor: FiltroTipoMovimiento) => void;
  desde: string;
  hasta: string;
  onDesdeChange: (value: string) => void;
  onHastaChange: (value: string) => void;
  onLimpiarFechas: () => void;
}

export function BarHistorialToolbar({
  search,
  onSearchChange,
  filtroTipoMov,
  onFiltroTipoMovChange,
  desde,
  hasta,
  onDesdeChange,
  onHastaChange,
  onLimpiarFechas
}: BarHistorialToolbarProps) {
  return (
    <div className='rounded-2xl border bg-card p-3'>
      <div className='relative'>
        <Search className='pointer-events-none absolute left-6 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          value={search}
          onChange={event => onSearchChange(event.target.value)}
          placeholder='Buscar producto, presentación o usuario'
          aria-label='Buscar en el historial del bar'
          className='h-11 rounded-full pl-9 pr-12'
        />
        {search && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='absolute right-5 top-1/2 size-9 -translate-y-1/2 rounded-full'
            aria-label='Limpiar búsqueda del historial'
            onClick={() => onSearchChange('')}
          >
            <X />
          </Button>
        )}
      </div>
      <div
        role='group'
        aria-label='Filtrar por tipo de movimiento'
        className='mt-3 flex flex-wrap gap-2'
      >
        {TIPOS_MOVIMIENTO.map(tipo => (
          <Button
            key={tipo.valor}
            type='button'
            size='sm'
            variant={filtroTipoMov === tipo.valor ? 'secondary' : 'outline'}
            aria-pressed={filtroTipoMov === tipo.valor}
            onClick={() => onFiltroTipoMovChange(tipo.valor)}
            className='h-8 rounded-full px-3 text-xs'
          >
            {tipo.etiqueta}
          </Button>
        ))}
      </div>
      <div className='mt-3 flex flex-wrap items-end gap-3'>
        <div className='space-y-1'>
          <Label htmlFor='historial-desde' className='text-xs font-medium text-muted-foreground'>
            Fecha desde
          </Label>
          <DatePicker
            id='historial-desde'
            value={desde}
            onChange={onDesdeChange}
            maxDate={hasta || undefined}
            displayFormat='short'
            className='h-11 w-[11rem] rounded-full px-4'
          />
        </div>
        <div className='space-y-1'>
          <Label htmlFor='historial-hasta' className='text-xs font-medium text-muted-foreground'>
            Fecha hasta
          </Label>
          <DatePicker
            id='historial-hasta'
            value={hasta}
            onChange={onHastaChange}
            minDate={desde || undefined}
            displayFormat='short'
            className='h-11 w-[11rem] rounded-full px-4'
          />
        </div>
        {desde || hasta ? (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            aria-label='Limpiar filtro de fecha'
            onClick={onLimpiarFechas}
            className='h-11 gap-1 rounded-full px-3 text-xs'
          >
            <X className='size-3.5' aria-hidden='true' />
            Limpiar fechas
          </Button>
        ) : null}
      </div>
    </div>
  );
}

interface BarColacionesToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function BarColacionesToolbar({ search, onSearchChange }: BarColacionesToolbarProps) {
  return (
    <SearchToolbar
      search={search}
      onSearchChange={onSearchChange}
      placeholder='Buscar trabajador o bebida'
      ariaLabel='Buscar colaciones'
      clearAriaLabel='Limpiar búsqueda de colaciones'
    />
  );
}

interface BarCortesiasToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function BarCortesiasToolbar({ search, onSearchChange }: BarCortesiasToolbarProps) {
  return (
    <SearchToolbar
      search={search}
      onSearchChange={onSearchChange}
      placeholder='Buscar cliente o quién registró la entrada'
      ariaLabel='Buscar cortesías'
      clearAriaLabel='Limpiar búsqueda de cortesías'
    />
  );
}

interface BarEnvasesToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  puedeDevolver: boolean;
  esCodigoEnvase: boolean;
  envaseYaDevuelto: boolean;
  verificando: boolean;
  /** Se invoca al enviar el formulario (el guard del escaneo vive en la página). */
  onSubmit: () => void;
  avisoSonoro: boolean;
  onAlternarSonido: () => void;
}

export function BarEnvasesToolbar({
  search,
  onSearchChange,
  inputRef,
  puedeDevolver,
  esCodigoEnvase,
  envaseYaDevuelto,
  verificando,
  onSubmit,
  avisoSonoro,
  onAlternarSonido
}: BarEnvasesToolbarProps) {
  return (
    <form
      className='flex flex-col gap-2 rounded-2xl border bg-card p-3 sm:flex-row sm:items-center sm:gap-3'
      onSubmit={event => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className='relative min-w-0 flex-1'>
        <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          autoFocus
          ref={inputRef}
          value={search}
          onChange={event => onSearchChange(event.target.value)}
          placeholder='Busca devoluciones o escanea un código de envase'
          aria-label='Buscar devoluciones o escanear un envase'
          className='h-11 rounded-full pl-9 pr-12'
        />
        {search && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='absolute right-1 top-1/2 size-9 -translate-y-1/2 rounded-full'
            aria-label='Limpiar búsqueda o código de envase'
            onClick={() => onSearchChange('')}
          >
            <X />
          </Button>
        )}
      </div>
      {puedeDevolver && (
        <Button
          type='submit'
          disabled={verificando || !esCodigoEnvase || envaseYaDevuelto}
          className='h-11 shrink-0 gap-2 rounded-full'
          title={envaseYaDevuelto ? 'Este envase ya figura en las devoluciones' : undefined}
        >
          <PackageCheck className='size-4' />
          {verificando ? 'Verificando...' : 'Verificar y marcar'}
        </Button>
      )}
      <Button
        type='button'
        variant='outline'
        className='h-11 shrink-0 gap-2 rounded-full'
        onClick={onAlternarSonido}
        aria-pressed={avisoSonoro}
        aria-label={avisoSonoro ? 'Silenciar avisos de escaneo' : 'Activar avisos de escaneo'}
      >
        {avisoSonoro ? <Bell className='size-4' /> : <BellOff className='size-4' />}
        <span className='hidden sm:inline'>{avisoSonoro ? 'Aviso sonoro' : 'Sin aviso'}</span>
      </Button>
    </form>
  );
}
