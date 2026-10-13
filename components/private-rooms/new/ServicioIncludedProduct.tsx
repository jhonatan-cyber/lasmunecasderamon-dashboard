'use client';
import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem
} from '@/components/ui/command';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { Check, ChevronsUpDown } from 'lucide-react';

function photoSource(foto?: string) {
  if (!foto) return '/api/images/products/default.png';
  return foto.startsWith('http') || foto.startsWith('/')
    ? foto
    : `/api/images/products/${encodeURIComponent(foto)}`;
}
export function ServicioIncludedProduct({
  value,
  onChange
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [productos, setProductos] = useState<
    Array<{
      id: string;
      nombre: string;
      stock: number;
      categoria: string;
      codigos: string[];
      foto?: string;
    }>
  >([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/bar', { signal: controller.signal })
      .then(r => r.json())
      .then(res => {
        if (!res.success) throw new Error('No se pudo cargar el inventario del bar');
        setProductos(
          res.data
            .map((p: any) => ({
              id: String(p.presentacion_id || p.id),
              foto: p.foto || p.producto_foto,
              categoria: p.categoria_nombre || '',
              codigos: [p.producto_codigo, p.codigo_barras, ...(p.codigos_unidades_bar || [])]
                .filter(Boolean)
                .map(String),
              nombre: `${p.producto_nombre || p.nombre} · ${p.presentacion_nombre || p.nombre || ''}`,
              stock: Number(p.stock_bar_cerrado ?? p.stock_bar ?? p.cantidad_bar ?? p.cantidad ?? 0)
            }))
            .filter((p: any) => p.stock > 0)
        );
      })
      .catch(err => {
        if (err.name !== 'AbortError')
          setError('No se pudo cargar el inventario del bar. Vuelve a abrir el formulario.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  const seleccionado = productos.find(p => p.id === value);
  return (
    <div className='space-y-2'>
      <Label>Producto incluido en la habitación</Label>
      <Popover
        open={open}
        onOpenChange={next => {
          setOpen(next);
          if (next) setSearch('');
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type='button'
            variant='outline'
            role='combobox'
            aria-expanded={open}
            aria-label='Producto incluido en la habitación'
            className='h-auto min-h-11 w-full min-w-0 justify-between rounded-full text-left'
          >
            {seleccionado ? (
              <span className='flex min-w-0 items-center gap-3'>
                <ProductPhoto
                  src={photoSource(seleccionado.foto)}
                  alt=''
                  width={36}
                  height={36}
                  className='h-9 w-9 shrink-0 rounded-lg object-contain'
                />
                <span className='truncate'>{seleccionado.nombre}</span>
              </span>
            ) : (
              <span className='truncate text-muted-foreground'>Selecciona una unidad del bar</span>
            )}
            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0' align='start'>
          <Command>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder='Buscar nombre, categoría o escanear código...'
              onKeyDown={event => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                const code = search.trim().toLowerCase();
                const matches = productos.filter(p =>
                  p.codigos.some(c => c.toLowerCase() === code)
                );
                if (code && matches.length === 1) {
                  event.stopPropagation();
                  onChange(matches[0].id);
                  setOpen(false);
                }
              }}
            />
            <CommandList>
              <CommandEmpty>
                {loading
                  ? 'Cargando productos...'
                  : error || 'No hay productos disponibles para esta búsqueda.'}
              </CommandEmpty>
              <CommandGroup>
                {productos.map(p => (
                  <CommandItem
                    key={p.id}
                    value={p.id}
                    keywords={[p.nombre, p.categoria, ...p.codigos]}
                    onSelect={() => {
                      onChange(p.id);
                      setOpen(false);
                    }}
                    className='gap-3 py-2'
                  >
                    <ProductPhoto
                      src={photoSource(p.foto)}
                      alt=''
                      width={48}
                      height={48}
                      className='h-12 w-12 shrink-0 rounded-lg bg-muted object-contain'
                    />
                    <span className='min-w-0 flex-1'>
                      <span className='block break-words font-medium'>{p.nombre}</span>
                      <span className='block text-xs text-muted-foreground'>
                        {p.categoria && `${p.categoria} · `}Bar: {p.stock} unidades
                      </span>
                    </span>
                    {value === p.id && <Check className='shrink-0 text-primary' />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className='text-xs text-muted-foreground'>
        Incluye una unidad completa, sin cobro adicional.
      </p>
      {error && (
        <p role='alert' className='text-sm text-destructive'>
          {error}
        </p>
      )}
    </div>
  );
}
