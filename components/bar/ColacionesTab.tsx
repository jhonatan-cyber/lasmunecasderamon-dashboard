'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, ChevronsUpDown, GlassWater, LoaderCircle, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { cn } from '@/lib/utils/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

type Worker = { id: string; name: string; lastName: string; nick?: string; role?: string };
type Drink = {
  presentacion_id: string;
  presentacion_nombre: string;
  producto_nombre: string;
  ml_botella?: number | null;
  opciones_venta?: {
    tipo: string;
    acompanamiento?: { tipo?: 'gaseosa' | 'soda'; unidades: number };
  }[];
};
type RecordRow = {
  id: string;
  usuario_id: string;
  trabajador: string;
  nick?: string | null;
  nombre_bebida?: string | null;
  ml_bebida: number;
  acompanamiento?: 'gaseosa' | 'soda' | null;
  registrado_por_nombre: string;
  fecha_crea: string;
};

export function SearchableSelect({
  id,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  options
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  options: { value: string; label: string; keywords?: string[] }[];
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className='h-11 w-full justify-between rounded-full font-normal'
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className='ml-2 size-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent align='start' className='w-[var(--radix-popover-trigger-width)] p-0'>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            <CommandGroup>
              {options.map(option => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label, ...(option.keywords ?? [])]}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn('size-4', value === option.value ? 'opacity-100' : 'opacity-0')}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ColacionesTab({ searchTerm = '' }: { searchTerm?: string }) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [workerId, setWorkerId] = useState('');
  const [drinkId, setDrinkId] = useState('');
  const [mlBebida, setMlBebida] = useState('');
  const [accompaniment, setAccompaniment] = useState<'ninguno' | 'gaseosa' | 'soda'>('ninguno');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { hasOpenCaja, cajaInfo } = useCashRegisterStatus();
  const cajaId = cajaInfo?.id_caja;
  const { hasPermission } = useUserPermissions();
  const canCreate = hasPermission('products', 'write');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cajaId) params.set('caja_id', String(cajaId));
      const [usersResponse, drinksResponse, recordsResponse] = await Promise.all([
        fetch('/api/users?status=active&limit=500', { cache: 'no-store' }),
        fetch('/api/products/for-sale?solo_colaciones=true', { cache: 'no-store' }),
        fetch(`/api/colaciones?${params}`, { cache: 'no-store' })
      ]);
      const [usersJson, drinksJson, recordsJson] = await Promise.all([
        usersResponse.json(),
        drinksResponse.json(),
        recordsResponse.json()
      ]);
      if (!usersResponse.ok || !usersJson.success) throw new Error('No se pudo cargar el personal');
      if (!drinksResponse.ok || !drinksJson.success)
        throw new Error('No se pudieron cargar las bebidas habilitadas');
      if (!recordsResponse.ok || !recordsJson.success)
        throw new Error('No se pudieron cargar las colaciones del turno');
      setWorkers(
        (usersJson.data || []).filter(
          (person: Worker) => person.role?.toLowerCase() !== 'administrador'
        )
      );
      setDrinks(drinksJson.data || []);
      setRecords(recordsJson.data || []);
      setDrinkId(current =>
        (drinksJson.data || []).some((drink: Drink) => drink.presentacion_id === current)
          ? current
          : String(drinksJson.data?.[0]?.presentacion_id || '')
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cargar las colaciones');
    } finally {
      setLoading(false);
    }
  }, [cajaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const attended = useMemo(() => new Set(records.map(row => row.usuario_id)), [records]);
  const visibleRecords = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase('es');
    return records.filter(
      row =>
        !term ||
        [row.trabajador, row.nick, row.nombre_bebida, row.acompanamiento].some(value =>
          String(value ?? '')
            .toLocaleLowerCase('es')
            .includes(term)
        )
    );
  }, [records, searchTerm]);
  const selectedDrink = drinks.find(drink => drink.presentacion_id === drinkId);
  const bottle = selectedDrink?.opciones_venta?.find(option => option.tipo === 'botella');
  const accompanimentConfig = bottle?.acompanamiento;
  const accompanimentUnits = Number(accompanimentConfig?.unidades ?? 0);

  useEffect(() => {
    setAccompaniment('ninguno');
    const capacity = Number(
      drinks.find(drink => drink.presentacion_id === drinkId)?.ml_botella ?? 0
    );
    setMlBebida(capacity > 0 ? String(capacity) : '');
  }, [drinkId, drinks]);

  const register = async (event: FormEvent) => {
    event.preventDefault();
    if (!workerId || !selectedDrink) return toast.error('Selecciona trabajador y bebida');
    const ml = Number(mlBebida);
    if (!Number.isInteger(ml) || ml < 1 || ml > 10000)
      return toast.error('Indica entre 1 y 10000 ml para la bebida');
    setSaving(true);
    try {
      const response = await fetch('/api/colaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: workerId,
          presentacion_id: drinkId,
          ml_bebida: ml,
          nombre_bebida:
            `${selectedDrink.producto_nombre} ${selectedDrink.presentacion_nombre}`.trim(),
          acompanamiento: accompaniment === 'ninguno' ? null : accompaniment
        })
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || 'No se pudo registrar la colación');
      toast.success('Corto registrado');
      setWorkerId('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar el corto');
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='space-y-5'>
      <section className='rounded-2xl border bg-card p-4 shadow-xs sm:p-5'>
        <div className='mb-4 flex items-start gap-3'>
          <div className='rounded-xl border bg-background p-2.5 text-primary'>
            <GlassWater className='size-5' aria-hidden='true' />
          </div>
          <div>
            <h2 className='font-semibold'>Registrar colación</h2>
            <p className='text-sm text-muted-foreground'>
              Un corto por trabajador durante el turno de caja.
            </p>
          </div>
        </div>

        {canCreate ? (
          <form onSubmit={register} className='grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='bar-colacion-trabajador'>Trabajador</Label>
              <SearchableSelect
                id='bar-colacion-trabajador'
                value={workerId}
                onChange={setWorkerId}
                placeholder='Seleccionar trabajador'
                searchPlaceholder='Buscar trabajador…'
                options={workers
                  .filter(worker => !attended.has(worker.id))
                  .map(worker => ({
                    value: worker.id,
                    label: `${worker.name} ${worker.lastName}${worker.nick ? ` · ${worker.nick}` : ''}`,
                    keywords: [worker.nick ?? '']
                  }))}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='bar-colacion-ml'>Ml de bebida analcohólica</Label>
              <Input
                id='bar-colacion-ml'
                type='number'
                min={1}
                max={10000}
                step={1}
                inputMode='numeric'
                value={mlBebida}
                onChange={event => setMlBebida(event.target.value.replace(/\D/g, ''))}
                placeholder='Ej. 350'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='bar-colacion-bebida'>Bebida</Label>
              <SearchableSelect
                id='bar-colacion-bebida'
                value={drinkId}
                onChange={setDrinkId}
                placeholder='Seleccionar bebida'
                searchPlaceholder='Buscar producto o presentación…'
                options={drinks.map(drink => ({
                  value: drink.presentacion_id,
                  label: `${drink.producto_nombre} · ${drink.presentacion_nombre}`,
                  keywords: [drink.producto_nombre, drink.presentacion_nombre]
                }))}
              />
            </div>

            {drinkId && accompanimentUnits > 0 && (
              <div className='space-y-2'>
                <Label htmlFor='bar-colacion-acompanamiento'>Acompañamiento</Label>
                <SearchableSelect
                  id='bar-colacion-acompanamiento'
                  value={accompaniment}
                  onChange={value => setAccompaniment(value as typeof accompaniment)}
                  placeholder='Seleccionar bebida analcohólica'
                  searchPlaceholder='Buscar bebida analcohólica…'
                  options={[
                    { value: 'ninguno', label: 'Sin bebida analcohólica' },
                    { value: 'gaseosa', label: 'Gaseosa' },
                    { value: 'soda', label: 'Soda' }
                  ]}
                />
                <p className='text-xs text-muted-foreground'>
                  Unidades incluidas: {accompanimentUnits}
                </p>
              </div>
            )}

            <div className='flex justify-center pt-1 sm:col-span-2'>
              <Button
                type='submit'
                className='w-full rounded-full sm:w-auto'
                disabled={saving || loading || !hasOpenCaja || !workerId || !drinkId || !mlBebida}
              >
                {saving ? (
                  <LoaderCircle className='mr-2 size-4 animate-spin' />
                ) : (
                  <ReceiptText className='mr-2 size-4' />
                )}
                Registrar corto
              </Button>
            </div>
          </form>
        ) : (
          <p className='text-sm text-muted-foreground'>
            No tienes permiso para registrar colaciones.
          </p>
        )}
        {!hasOpenCaja && (
          <p className='mt-3 text-sm text-amber-600'>
            Se requiere una caja abierta para registrar un corto.
          </p>
        )}
        {drinks.length === 0 && !loading && (
          <p className='mt-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground'>
            No hay bebidas habilitadas para colación con stock en el bar.
          </p>
        )}
      </section>

      <section className='overflow-hidden rounded-2xl border bg-card shadow-xs'>
        <div className='flex flex-wrap items-center justify-between gap-2 border-b p-4'>
          <div>
            <h2 className='font-semibold'>Colaciones del turno</h2>
            <p className='text-sm text-muted-foreground'>
              Trabajadores que ya recibieron su corto.
            </p>
          </div>
          <span className='text-sm font-medium tabular-nums'>
            {visibleRecords.length} registrados
          </span>
        </div>
        {loading ? (
          <div className='flex items-center gap-2 p-6 text-sm text-muted-foreground'>
            <LoaderCircle className='size-4 animate-spin' /> Cargando colaciones…
          </div>
        ) : visibleRecords.length === 0 ? (
          <div className='p-8 text-center'>
            <GlassWater className='mx-auto mb-2 size-7 text-muted-foreground' />
            <p className='font-medium'>
              {searchTerm
                ? 'No hay colaciones que coincidan'
                : 'Aún no hay colaciones en este turno'}
            </p>
            <p className='mt-1 text-sm text-muted-foreground'>
              Los registros aparecerán aquí al entregar un corto.
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <Table className='min-w-[640px]'>
              <TableHeader>
                <TableRow>
                  <TableHead>Trabajador</TableHead>
                  <TableHead>Bebida</TableHead>
                  <TableHead>Ml</TableHead>
                  <TableHead>Acompañamiento</TableHead>
                  <TableHead>Registró</TableHead>
                  <TableHead>Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRecords.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className='font-medium'>
                      {row.trabajador}
                      {row.nick ? (
                        <span className='ml-1 text-muted-foreground'>({row.nick})</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{row.nombre_bebida || 'Corto'}</TableCell>
                    <TableCell className='tabular-nums'>{row.ml_bebida} ml</TableCell>
                    <TableCell className='capitalize'>{row.acompanamiento || '—'}</TableCell>
                    <TableCell>{row.registrado_por_nombre}</TableCell>
                    <TableCell>
                      {new Date(row.fecha_crea).toLocaleTimeString('es-CL', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
